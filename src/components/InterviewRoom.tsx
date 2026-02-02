import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, Loader2, Volume2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InterviewRoomProps {
  candidateName: string;
  category: string;
  onComplete: (data: {
    questions: string[];
    responses: { question: string; answer: string }[];
    videoUrl: string | null;
  }) => void;
}

export const InterviewRoom = ({ candidateName, category, onComplete }: InterviewRoomProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<{ question: string; answer: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [hasSpoken, setHasSpoken] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | null>(null);

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
  }, [category]);

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("interview-ai", {
        body: { action: "generate_questions", category },
      });

      if (error) throw error;

      const loadedQuestions = data.result as string[];
      setQuestions(loadedQuestions);
      setResponses(loadedQuestions.map((q) => ({ question: q, answer: "" })));
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Failed to load questions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Start camera and microphone - MUST be called directly from user gesture
  const startMedia = async () => {
    try {
      // CRITICAL: getUserMedia called directly in click handler
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        await videoRef.current.play().catch(console.error);
      }

      setVideoEnabled(true);
      setMicEnabled(true);

      // Determine supported mimeType
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      console.log("Using mimeType:", mimeType);

      // Start recording
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        console.log("Data available:", e.data.size);
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      console.log("Recording started");
    } catch (error) {
      console.error("Error accessing media devices:", error);
      if ((error as Error).name === "NotAllowedError") {
        toast.error("Camera and microphone access denied. Please check browser permissions.");
      } else {
        toast.error("Please allow camera and microphone access to continue.");
      }
    }
  };

  // Speak a question using Web Speech API
  const speakQuestion = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setHasSpoken(true);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setHasSpoken(true);
        resolve();
      };

      speechSynthesis.speak(utterance);
    });
  }, []);

  // Start listening for answer
  const startListening = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      toast.error("Speech recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }
      setCurrentAnswer(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, []);

  // Stop listening and save answer
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);

    // Save the current answer
    setResponses((prev) => {
      const updated = [...prev];
      updated[currentQuestionIndex] = {
        question: questions[currentQuestionIndex],
        answer: currentAnswer,
      };
      return updated;
    });
  }, [currentAnswer, currentQuestionIndex, questions]);

  // Move to next question or finish
  const handleNext = async () => {
    stopListening();
    setHasSpoken(false);
    setCurrentAnswer("");

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      await finishInterview();
    }
  };

  // Finish interview and upload video
  const finishInterview = async () => {
    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        // Wait for the recorder to stop and get final data
        mediaRecorderRef.current.onstop = async () => {
          console.log("MediaRecorder stopped, chunks:", chunksRef.current.length);
          await uploadAndComplete();
          resolve();
        };
        mediaRecorderRef.current.stop();
      } else {
        uploadAndComplete().then(resolve);
      }
    });

    async function uploadAndComplete() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      let videoUrl: string | null = null;

      // Upload video if we have chunks
      console.log("Total chunks to upload:", chunksRef.current.length);
      if (chunksRef.current.length > 0) {
        try {
          // Get authenticated user for storage path
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            toast.error("Authentication required to upload recordings");
            onComplete({ questions, responses, videoUrl: null });
            return;
          }

          const mimeType = mediaRecorderRef.current?.mimeType || "video/webm";
          const extension = mimeType.includes("mp4") ? "mp4" : "webm";
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          console.log("Blob size:", blob.size, "type:", blob.type);
          
          // Include user ID in path for RLS compliance
          const fileName = `${user.id}/interview-${candidateName.replace(/\s+/g, "-")}-${Date.now()}.${extension}`;

          toast.loading("Saving video recording...", { id: "upload" });

          const { data, error } = await supabase.storage
            .from("interview-recordings")
            .upload(fileName, blob, {
              contentType: mimeType,
              upsert: false,
            });

          if (error) {
            console.error("Upload error:", error);
            throw error;
          }

          console.log("Upload successful:", data);

          // Use signed URL for private bucket
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from("interview-recordings")
            .createSignedUrl(fileName, 3600); // 1 hour expiry

          if (signedUrlError) {
            console.error("Signed URL error:", signedUrlError);
            throw signedUrlError;
          }

          videoUrl = signedUrlData.signedUrl;
          console.log("Video URL:", videoUrl);
          toast.success("Video saved successfully!", { id: "upload" });
        } catch (error) {
          console.error("Error uploading video:", error);
          toast.error("Failed to save video recording.", { id: "upload" });
        }
      }

      onComplete({ questions, responses, videoUrl });
    }
  };

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing your interview...</p>
        </motion.div>
      </div>
    );
  }

  if (!videoEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full glass flex items-center justify-center">
            <Video className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-4">Enable Camera</h2>
          <p className="text-muted-foreground mb-8">
            Please enable your camera and microphone to start the interview. 
            Your session will be recorded.
          </p>
          <Button
            onClick={startMedia}
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            Enable Camera & Microphone
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
            <h2 className="text-xl font-display font-semibold capitalize">
              {category} Interview
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-muted"}`} />
            <span className="text-sm text-muted-foreground">Recording</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 grid md:grid-cols-2 gap-6 max-w-6xl mx-auto w-full">
        {/* Video Preview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative rounded-2xl overflow-hidden glass min-h-[300px] md:min-h-[400px] bg-muted"
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover absolute inset-0"
            style={{ 
              transform: "scaleX(-1)",
              WebkitTransform: "scaleX(-1)",
              MozTransform: "scaleX(-1)",
            }}
          />
          
          {/* Video Controls Overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-10">
            <Button
              size="icon"
              variant={videoEnabled ? "default" : "destructive"}
              className="rounded-full w-12 h-12"
              onClick={() => {
                if (streamRef.current) {
                  streamRef.current.getVideoTracks().forEach((t) => (t.enabled = !videoEnabled));
                  setVideoEnabled(!videoEnabled);
                }
              }}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            <Button
              size="icon"
              variant={micEnabled ? "default" : "destructive"}
              className="rounded-full w-12 h-12"
              onClick={() => {
                if (streamRef.current) {
                  streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !micEnabled));
                  setMicEnabled(!micEnabled);
                }
              }}
            >
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
          </div>

          {/* Name Badge */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg glass-strong z-10">
            <p className="text-sm font-medium">{candidateName}</p>
          </div>
        </motion.div>

        {/* Question Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          {/* Question Card */}
          <div className="flex-1 glass rounded-2xl p-6 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
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
                  {questions[currentQuestionIndex]}
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
                    className="flex items-center gap-2 text-red-400"
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium">Listening... Speak your answer</span>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="flex gap-3 mt-6">
              {!hasSpoken ? (
                <Button
                  onClick={() => speakQuestion(questions[currentQuestionIndex])}
                  disabled={isSpeaking}
                  className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  <Volume2 className="w-5 h-5 mr-2" />
                  Listen to Question
                </Button>
              ) : !isListening ? (
                <Button
                  onClick={startListening}
                  className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Speaking
                </Button>
              ) : (
                <Button
                  onClick={stopListening}
                  variant="destructive"
                  className="flex-1 h-12"
                >
                  <MicOff className="w-5 h-5 mr-2" />
                  Stop Recording
                </Button>
              )}

              {hasSpoken && !isListening && (
                <Button
                  onClick={handleNext}
                  variant="outline"
                  className="h-12 px-6"
                >
                  {currentQuestionIndex < questions.length - 1 ? "Next" : "Finish"}
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
