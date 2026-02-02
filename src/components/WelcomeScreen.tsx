import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WelcomeScreenProps {
  onNext: (name: string) => void;
}

export const WelcomeScreen = ({ onNext }: WelcomeScreenProps) => {
  const [name, setName] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onNext(name.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg text-center"
      >
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="w-20 h-20 mx-auto mb-8 rounded-2xl glass gradient-border flex items-center justify-center"
        >
          <Sparkles className="w-10 h-10 text-primary" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-display font-bold mb-4"
        >
          <span className="gradient-text">AI Interview</span>
          <br />
          <span className="text-foreground">Assistant</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground text-lg mb-10"
        >
          Experience the future of technical interviews with our AI-powered platform
        </motion.p>

        {/* Name Input Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="relative">
            <motion.div
              animate={{
                boxShadow: isFocused
                  ? "0 0 40px hsl(180, 100%, 50%, 0.3)"
                  : "0 0 0px transparent",
              }}
              transition={{ duration: 0.3 }}
              className="rounded-xl"
            >
              <Input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="h-14 text-lg bg-card border-border/50 focus:border-primary/50 rounded-xl px-5 transition-all duration-300"
              />
            </motion.div>
          </div>

          <Button
            type="submit"
            disabled={!name.trim()}
            size="lg"
            className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            Start Interview
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.form>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 flex justify-center gap-8 text-sm text-muted-foreground"
        >
          {["Voice-Based", "AI-Powered", "Real-Time Analysis"].map((feature, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {feature}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};
