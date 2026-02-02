import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create admin client to verify the token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the JWT by getting the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("JWT verification failed:", authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Authenticated user: ${userId}`);

    const { action, category, responses, candidateName } = await req.json();
    
    // Input validation
    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['generate_questions', 'analyze_responses'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!category || typeof category !== 'string' || category.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid category parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    // Sanitize category for use in prompts
    const sanitizedCategory = category.replace(/[<>{}]/g, '').substring(0, 50);

    if (action === "generate_questions") {
      systemPrompt = `You are an expert technical interviewer. Generate exactly 5 technical interview questions for a ${sanitizedCategory} developer position. 
      
The questions should:
- Progress from easy to hard
- Cover fundamental concepts, practical scenarios, and problem-solving
- Be clear and concise
- Test real-world knowledge

Return ONLY a JSON array of 5 question strings. No other text.
Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;
      
      userPrompt = `Generate 5 ${sanitizedCategory} interview questions.`;
    } else if (action === "analyze_responses") {
      // Validate responses array
      if (!Array.isArray(responses) || responses.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid responses parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sanitize candidate name
      const sanitizedName = (candidateName || 'Candidate').replace(/[<>{}]/g, '').substring(0, 100);

      systemPrompt = `You are an expert technical interviewer analyzing interview responses. Evaluate the candidate's performance and provide constructive feedback.

Be encouraging but honest. Consider:
- Technical accuracy
- Communication clarity
- Problem-solving approach
- Depth of knowledge

Provide:
1. An overall score from 0-100
2. A detailed analysis (2-3 paragraphs)
3. Key strengths
4. Areas for improvement
5. Hiring recommendation

Return as JSON with this exact format:
{
  "score": number,
  "analysis": "detailed analysis text",
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "recommendation": "hire/consider/not_recommended"
}`;

      // Sanitize responses
      const sanitizedResponses = responses.slice(0, 10).map((r: { question: string; answer: string }, i: number) => {
        const question = (r.question || '').replace(/[<>{}]/g, '').substring(0, 500);
        const answer = (r.answer || '(No response provided)').replace(/[<>{}]/g, '').substring(0, 2000);
        return `Q${i + 1}: ${question}\nA${i + 1}: ${answer}`;
      });

      userPrompt = `Candidate: ${sanitizedName}
Position: ${sanitizedCategory} Developer

Interview Q&A:
${sanitizedResponses.join("\n\n")}

Analyze this interview and provide feedback.`;
    }

    console.log(`Processing ${action} for category: ${sanitizedCategory}, user: ${userId}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log("AI Response received successfully");

    // Parse JSON from the response
    let result;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      result = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      if (action === "generate_questions") {
        result = [
          `What are the core concepts of ${sanitizedCategory}?`,
          `Explain a challenging ${sanitizedCategory} problem you've solved.`,
          `How do you handle debugging in ${sanitizedCategory}?`,
          `What best practices do you follow in ${sanitizedCategory}?`,
          `Describe a ${sanitizedCategory} project you're proud of.`
        ];
      } else {
        result = {
          score: 70,
          analysis: "Unable to generate detailed analysis. The candidate showed general knowledge of the subject.",
          strengths: ["Participated in the interview"],
          improvements: ["Could provide more detailed responses"],
          recommendation: "consider"
        };
      }
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Interview AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
