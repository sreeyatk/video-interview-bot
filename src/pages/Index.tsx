import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { CategorySelection } from "@/components/CategorySelection";
import { InterviewRoom } from "@/components/InterviewRoom";
import { ResultsScreen } from "@/components/ResultsScreen";

type Step = "welcome" | "category" | "interview" | "results";

interface InterviewData {
  candidateName: string;
  category: string;
  questions: string[];
  responses: { question: string; answer: string }[];
  videoUrl: string | null;
}

const Index = () => {
  const [step, setStep] = useState<Step>("welcome");
  const [interviewData, setInterviewData] = useState<InterviewData>({
    candidateName: "",
    category: "",
    questions: [],
    responses: [],
    videoUrl: null,
  });

  const handleNameSubmit = (name: string) => {
    setInterviewData((prev) => ({ ...prev, candidateName: name }));
    setStep("category");
  };

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
      candidateName: "",
      category: "",
      questions: [],
      responses: [],
      videoUrl: null,
    });
    setStep("welcome");
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {step === "welcome" && <WelcomeScreen onNext={handleNameSubmit} />}
        
        {step === "category" && (
          <CategorySelection
            candidateName={interviewData.candidateName}
            onSelect={handleCategorySelect}
            onBack={() => setStep("welcome")}
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
  );
};

export default Index;
