import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { CategorySelection } from "@/components/CategorySelection";
import { InterviewRoom } from "@/components/InterviewRoom";
import { ResultsScreen } from "@/components/ResultsScreen";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

type Step = "category" | "interview" | "results";

interface InterviewData {
  candidateName: string;
  category: string;
  questions: string[];
  responses: { question: string; answer: string }[];
  videoUrl: string | null;
}

const Index = () => {
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<Step>("category");
  const [interviewData, setInterviewData] = useState<InterviewData>({
    candidateName: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Candidate",
    category: "",
    questions: [],
    responses: [],
    videoUrl: null,
  });

  const handleCategorySelect = (category: string) => {
    setInterviewData((prev) => ({ ...prev, category }));
    setStep("interview");
  };

  const handleInterviewComplete = (data: {
    questions: string[];
    responses: { question: string; answer: string }[];
    videoUrl: string | null;
  }) => {
    setInterviewData((prev) => ({
      ...prev,
      questions: data.questions,
      responses: data.responses,
      videoUrl: data.videoUrl,
    }));
    setStep("results");
  };

  const handleRestart = () => {
    setInterviewData({
      candidateName: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Candidate",
      category: "",
      questions: [],
      responses: [],
      videoUrl: null,
    });
    setStep("category");
  };

  return (
    <div className="relative">
      {/* Header with logout */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 right-4 z-50 flex items-center gap-3"
      >
        <span className="text-sm text-muted-foreground">
          {user?.email}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          className="rounded-full"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {step === "category" && (
            <CategorySelection
              candidateName={interviewData.candidateName}
              onSelect={handleCategorySelect}
              onBack={signOut}
            />
          )}
          
          {step === "interview" && (
            <InterviewRoom
              candidateName={interviewData.candidateName}
              category={interviewData.category}
              onComplete={handleInterviewComplete}
            />
          )}
          
          {step === "results" && (
            <ResultsScreen
              candidateName={interviewData.candidateName}
              category={interviewData.category}
              responses={interviewData.responses}
              videoUrl={interviewData.videoUrl}
              onRestart={handleRestart}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Index;
