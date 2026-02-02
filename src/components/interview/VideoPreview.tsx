import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import { Video, VideoOff, Mic, MicOff, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPreviewProps {
  candidateName: string;
  videoEnabled: boolean;
  micEnabled: boolean;
  captureCount: number;
  onToggleVideo: () => void;
  onToggleMic: () => void;
  onCapturePhoto: () => void;
}

export interface VideoPreviewRef {
  setStream: (stream: MediaStream) => void;
  captureFrame: () => string | null;
}

export const VideoPreview = forwardRef<VideoPreviewRef, VideoPreviewProps>(
  ({ candidateName, videoEnabled, micEnabled, captureCount, onToggleVideo, onToggleMic, onCapturePhoto }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useImperativeHandle(ref, () => ({
      setStream: (stream: MediaStream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      },
      captureFrame: () => {
        if (!videoRef.current || !canvasRef.current) return null;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        // Draw the current video frame (NOT mirrored - industry standard)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Return as data URL
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    }));

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative rounded-2xl overflow-hidden glass min-h-[300px] md:min-h-[400px] bg-muted"
      >
        {/* Hidden canvas for capturing frames */}
        <canvas ref={canvasRef} className="hidden" />
        
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            transform: "scaleX(-1)",
          }}
        />
        
        {/* Video Controls Overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-10">
          <Button
            size="icon"
            variant={videoEnabled ? "default" : "destructive"}
            className="rounded-full w-12 h-12"
            onClick={onToggleVideo}
          >
            {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
          <Button
            size="icon"
            variant={micEnabled ? "default" : "destructive"}
            className="rounded-full w-12 h-12"
            onClick={onToggleMic}
          >
            {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="rounded-full w-12 h-12"
            onClick={onCapturePhoto}
          >
            <Camera className="w-5 h-5" />
          </Button>
        </div>

        {/* Name Badge */}
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg glass-strong z-10">
          <p className="text-sm font-medium">{candidateName}</p>
        </div>

        {/* Photo Count Badge */}
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg glass-strong z-10">
          <p className="text-sm font-medium">📷 {captureCount}/3</p>
        </div>
      </motion.div>
    );
  }
);

VideoPreview.displayName = "VideoPreview";
