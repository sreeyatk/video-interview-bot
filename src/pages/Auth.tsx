import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, User, Sparkles } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateInputs = () => {
    try {
      emailSchema.parse(email);
    } catch {
      toast.error("Please enter a valid email address");
      return false;
    }

    try {
      passwordSchema.parse(password);
    } catch {
      toast.error("Password must be at least 6 characters");
      return false;
    }

    if (!isLogin && !fullName.trim()) {
      toast.error("Please enter your full name");
      return false;
    }

    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInputs()) return;

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password. Please try again.");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Please verify your email before logging in.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Welcome back!");
        navigate("/");
      } else {
        const redirectUrl = `${window.location.origin}/`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please log in instead.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Account created! Please check your email to verify your account.");
        setIsLogin(true);
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        {/* Logo/Brand */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl glass flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold gradient-text">
            AI Interviewer
          </h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? "Welcome back! Sign in to continue." : "Create an account to get started."}
          </p>
        </motion.div>

        {/* Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-8"
        >
          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 h-12 bg-background/50"
                  />
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-background/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-background/50"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg font-medium"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>
                  Don't have an account?{" "}
                  <span className="text-primary font-medium">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span className="text-primary font-medium">Sign in</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
