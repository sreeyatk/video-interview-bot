import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, AlertTriangle, CheckCircle, Loader2, RefreshCw, Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalysisResult {
  score: number;
  analysis: string;
  strengths: string[];
  improvements: string[];
  recommendation: string;
}

interface ResultsScreenProps {
  candidateName: string;
  category: string;
  responses: { question: string; answer: string }[];
  videoUrl: string | null;
  onRestart: () => void;
}

export const ResultsScreen = ({
  candidateName,
  category,
  responses,
  videoUrl,
  onRestart,
}: ResultsScreenProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    analyzeInterview();
  }, []);

  const analyzeInterview = async () => {
    try {
      setIsAnalyzing(true);
      const { data, error } = await supabase.functions.invoke("interview-ai", {
        body: {
          action: "analyze_responses",
          category,
          candidateName,
          responses,
        },
      });

      if (error) throw error;

      setAnalysis(data.result as AnalysisResult);
    } catch (error) {
      console.error("Error analyzing interview:", error);
      toast.error("Failed to analyze interview.");
      setAnalysis({
        score: 70,
        analysis: "We encountered an issue analyzing your responses. Please try again.",
        strengths: ["Completed the interview"],
        improvements: ["Unable to provide detailed feedback"],
        recommendation: "consider",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case "hire":
        return { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", text: "Recommended to Hire" };
      case "consider":
        return { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", text: "Consider for Role" };
      default:
        return { color: "bg-red-500/20 text-red-400 border-red-500/30", text: "Needs Improvement" };
    }
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="relative w-24 h-24 mx-auto mb-6">
            <Loader2 className="w-24 h-24 text-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Analyzing Your Interview</h2>
          <p className="text-muted-foreground">Our AI is reviewing your responses...</p>
        </motion.div>
      </div>
    );
  }

  if (!analysis) return null;

  const recBadge = getRecommendationBadge(analysis.recommendation);

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full glass flex items-center justify-center glow-primary"
          >
            <Trophy className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            Interview Complete!
          </h1>
          <p className="text-muted-foreground">
            Here's your performance analysis, <span className="text-primary">{candidateName}</span>
          </p>
        </motion.div>

        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-8 mb-6"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
              <div className={`text-6xl font-display font-bold ${getScoreColor(analysis.score)}`}>
                {analysis.score}
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
            </div>
            
            <div className="flex-1 max-w-xs">
              <Progress value={analysis.score} className="h-4 mb-3" />
              <div className={`inline-flex px-4 py-2 rounded-full text-sm font-medium border ${recBadge.color}`}>
                {recBadge.text}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 mb-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Performance Analysis
          </h3>
          <p className="text-muted-foreground leading-relaxed">{analysis.analysis}</p>
        </motion.div>

        {/* Strengths & Improvements */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Key Strengths
            </h3>
            <ul className="space-y-3">
              {analysis.strengths.map((strength, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                  {strength}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Areas for Improvement
            </h3>
            <ul className="space-y-3">
              {analysis.improvements.map((improvement, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 flex-shrink-0" />
                  {improvement}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Q&A Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-6 mb-6"
        >
          <h3 className="text-lg font-semibold mb-4">Interview Summary</h3>
          <div className="space-y-4">
            {responses.map((r, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/30">
                <p className="text-sm font-medium text-primary mb-2">Q{i + 1}: {r.question}</p>
                <p className="text-sm text-muted-foreground">
                  {r.answer || "(No response provided)"}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Video Recording */}
        {videoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-2xl p-6 mb-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Interview Recording
            </h3>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-xl"
              style={{ maxHeight: "400px" }}
            />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.open(videoUrl, "_blank")}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Recording
            </Button>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center"
        >
          <Button
            onClick={onRestart}
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Start New Interview
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
