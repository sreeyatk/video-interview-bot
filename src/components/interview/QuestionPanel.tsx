import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Mic, MicOff, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuestionPanelProps {
  question: string;
  currentAnswer: string;
  isSpeaking: boolean;
  isListening: boolean;
  hasSpoken: boolean;
  isLastQuestion: boolean;
  onListenToQuestion: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onNext: () => void;
}

export const QuestionPanel = ({
  question,
  currentAnswer,
  isSpeaking,
  isListening,
  hasSpoken,
  isLastQuestion,
  onListenToQuestion,
  onStartListening,
  onStopListening,
  onNext,
}: QuestionPanelProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col"
    >
      <div className="flex-1 glass rounded-2xl p-6 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={question}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1"
          >
            {/* AI Speaking Indicator */}
            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 mb-4 text-primary"
              >
                <Volume2 className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-medium">AI is speaking...</span>
              </motion.div>
            )}

            {/* Question Text */}
            <h3 className="text-xl md:text-2xl font-display font-semibold mb-6 leading-relaxed">
              {question}
            </h3>

            {/* Answer Display */}
            {currentAnswer && (
              <div className="p-4 rounded-xl bg-muted/50 mb-4">
                <p className="text-sm text-muted-foreground mb-1">Your Answer:</p>
                <p className="text-foreground">{currentAnswer}</p>
              </div>
            )}

            {/* Listening Indicator */}
            {isListening && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-destructive"
              >
                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-medium">Listening... Speak your answer</span>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex gap-3 mt-6">
          {!hasSpoken ? (
            <Button
              onClick={onListenToQuestion}
              disabled={isSpeaking}
              className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Volume2 className="w-5 h-5 mr-2" />
              Listen to Question
            </Button>
          ) : !isListening ? (
            <Button
              onClick={onStartListening}
              className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Mic className="w-5 h-5 mr-2" />
              Start Speaking
            </Button>
          ) : (
            <Button
              onClick={onStopListening}
              variant="destructive"
              className="flex-1 h-12"
            >
              <MicOff className="w-5 h-5 mr-2" />
              Stop Recording
            </Button>
          )}

          {hasSpoken && !isListening && (
            <Button
              onClick={onNext}
              variant="outline"
              className="h-12 px-6"
            >
              {isLastQuestion ? "Finish" : "Next"}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
