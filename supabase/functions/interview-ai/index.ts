import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, category, responses, candidateName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "generate_questions") {
      systemPrompt = `You are an expert technical interviewer. Generate exactly 5 technical interview questions for a ${category} developer position. 
      
The questions should:
- Progress from easy to hard
- Cover fundamental concepts, practical scenarios, and problem-solving
- Be clear and concise
- Test real-world knowledge

Return ONLY a JSON array of 5 question strings. No other text.
Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;
      
      userPrompt = `Generate 5 ${category} interview questions.`;
    } else if (action === "analyze_responses") {
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

      userPrompt = `Candidate: ${candidateName}
Position: ${category} Developer

Interview Q&A:
${responses.map((r: { question: string; answer: string }, i: number) => 
  `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.answer || "(No response provided)"}`
).join("\n\n")}

Analyze this interview and provide feedback.`;
    }

    console.log(`Processing ${action} for category: ${category}`);

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

    console.log("AI Response:", content);

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
          `What are the core concepts of ${category}?`,
          `Explain a challenging ${category} problem you've solved.`,
          `How do you handle debugging in ${category}?`,
          `What best practices do you follow in ${category}?`,
          `Describe a ${category} project you're proud of.`
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
