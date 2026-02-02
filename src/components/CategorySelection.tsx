import { motion } from "framer-motion";
import { ArrowLeft, Code, Database, Globe, Server, Smartphone, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  { id: "java", name: "Java", icon: Code, color: "from-orange-500 to-red-500" },
  { id: "python", name: "Python", icon: Terminal, color: "from-blue-500 to-cyan-500" },
  { id: "frontend", name: "Frontend", icon: Globe, color: "from-violet-500 to-purple-500" },
  { id: "php", name: "PHP", icon: Server, color: "from-indigo-500 to-blue-500" },
  { id: "react-native", name: "React Native", icon: Smartphone, color: "from-cyan-500 to-teal-500" },
  { id: "database", name: "Database/SQL", icon: Database, color: "from-emerald-500 to-green-500" },
];

interface CategorySelectionProps {
  candidateName: string;
  onSelect: (category: string) => void;
  onBack: () => void;
}

export const CategorySelection = ({ candidateName, onSelect, onBack }: CategorySelectionProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-8 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
            Hello, <span className="gradient-text">{candidateName}</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Select the technology you'd like to be interviewed on
          </p>
        </motion.div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(category.id)}
                className="group relative p-6 rounded-2xl glass border border-border/50 hover:border-primary/30 transition-all duration-300 text-left overflow-hidden"
              >
                {/* Gradient Overlay on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                {/* Icon Container */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Category Name */}
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                
                {/* Arrow Indicator */}
                <motion.div
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={{ x: -10 }}
                  whileHover={{ x: 0 }}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
