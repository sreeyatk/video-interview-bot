import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VideoPreview, VideoPreviewRef } from "@/components/interview/VideoPreview";
import { QuestionPanel } from "@/components/interview/QuestionPanel";

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [hasSpoken, setHasSpoken] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  const videoPreviewRef = useRef<VideoPreviewRef>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | null>(null);
  const autoCaptureTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
    return () => {
      // Cleanup timers on unmount
      autoCaptureTimersRef.current.forEach(timer => clearTimeout(timer));
    };
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

      if (videoPreviewRef.current) {
        videoPreviewRef.current.setStream(stream);
      }

      setVideoEnabled(true);
      setMicEnabled(true);

      // Schedule automatic photo captures at different points
      scheduleAutoCaptures();

    } catch (error) {
      console.error("Error accessing media devices:", error);
      if ((error as Error).name === "NotAllowedError") {
        toast.error("Camera and microphone access denied. Please check browser permissions.");
      } else {
        toast.error("Please allow camera and microphone access to continue.");
      }
    }
  };

  // Schedule automatic photo captures
  const scheduleAutoCaptures = () => {
    // Capture at 30s, 90s, and 150s after starting
    const captureIntervals = [30000, 90000, 150000];
    
    captureIntervals.forEach((interval, index) => {
      const timer = setTimeout(() => {
        if (capturedPhotos.length < 3) {
          capturePhoto();
          console.log(`Auto-captured photo ${index + 1} at ${interval / 1000}s`);
        }
      }, interval);
      autoCaptureTimersRef.current.push(timer);
    });
  };

  // Capture a photo from the video stream
  const capturePhoto = useCallback(() => {
    if (!videoPreviewRef.current) return;
    if (capturedPhotos.length >= 3) {
      toast.info("Maximum 3 photos already captured");
      return;
    }

    const photoData = videoPreviewRef.current.captureFrame();
    if (photoData) {
      setCapturedPhotos(prev => [...prev, photoData]);
      toast.success(`Photo ${capturedPhotos.length + 1} captured!`);
    }
  }, [capturedPhotos.length]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = !videoEnabled));
      setVideoEnabled(!videoEnabled);
    }
  }, [videoEnabled]);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !micEnabled));
      setMicEnabled(!micEnabled);
    }
  }, [micEnabled]);

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

  // Finish interview and upload photos
  const finishInterview = async () => {
    // Stop the media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Clear auto-capture timers
    autoCaptureTimersRef.current.forEach(timer => clearTimeout(timer));

    let photoUrls: string[] = [];

    // Upload captured photos
    if (capturedPhotos.length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Authentication required to upload photos");
          onComplete({ questions, responses, videoUrl: null });
          return;
        }

        toast.loading("Saving photos...", { id: "upload" });

        for (let i = 0; i < capturedPhotos.length; i++) {
          const photoData = capturedPhotos[i];
          
          // Convert base64 to blob
          const base64Data = photoData.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let j = 0; j < byteCharacters.length; j++) {
            byteNumbers[j] = byteCharacters.charCodeAt(j);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });

          const fileName = `${user.id}/interview-${candidateName.replace(/\s+/g, "-")}-${Date.now()}-photo${i + 1}.jpg`;

          const { data, error } = await supabase.storage
            .from("interview-recordings")
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (error) {
            console.error(`Upload error for photo ${i + 1}:`, error);
            continue;
          }

          // Get signed URL for the uploaded photo
          const { data: signedUrlData } = await supabase.storage
            .from("interview-recordings")
            .createSignedUrl(fileName, 3600);

          if (signedUrlData?.signedUrl) {
            photoUrls.push(signedUrlData.signedUrl);
          }
        }

        toast.success(`${photoUrls.length} photo(s) saved successfully!`, { id: "upload" });
      } catch (error) {
        console.error("Error uploading photos:", error);
        toast.error("Failed to save photos.", { id: "upload" });
      }
    }

    // Pass the first photo URL as videoUrl for backwards compatibility
    onComplete({ 
      questions, 
      responses, 
      videoUrl: photoUrls.length > 0 ? photoUrls[0] : null 
    });
  };

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

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
            We'll capture a few photos during the session.
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
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">In Progress</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 grid md:grid-cols-2 gap-6 max-w-6xl mx-auto w-full">
        {/* Video Preview */}
        <VideoPreview
          ref={videoPreviewRef}
          candidateName={candidateName}
          videoEnabled={videoEnabled}
          micEnabled={micEnabled}
          captureCount={capturedPhotos.length}
          onToggleVideo={toggleVideo}
          onToggleMic={toggleMic}
          onCapturePhoto={capturePhoto}
        />

        {/* Question Panel */}
        <QuestionPanel
          question={questions[currentQuestionIndex] || "Loading question..."}
          currentAnswer={currentAnswer}
          isSpeaking={isSpeaking}
          isListening={isListening}
          hasSpoken={hasSpoken}
          isLastQuestion={currentQuestionIndex >= questions.length - 1}
          onListenToQuestion={() => speakQuestion(questions[currentQuestionIndex])}
          onStartListening={startListening}
          onStopListening={stopListening}
          onNext={handleNext}
        />
      </div>
    </div>
  );
};
