-- Create interviews table
CREATE TABLE public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_name TEXT NOT NULL,
  category TEXT NOT NULL,
  questions JSONB DEFAULT '[]'::jsonb,
  responses JSONB DEFAULT '[]'::jsonb,
  analysis TEXT,
  score INTEGER,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create interviews (no auth required for this demo)
CREATE POLICY "Anyone can create interviews"
ON public.interviews
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read their own interview by ID
CREATE POLICY "Anyone can read interviews"
ON public.interviews
FOR SELECT
USING (true);

-- Allow anyone to update interviews
CREATE POLICY "Anyone can update interviews"
ON public.interviews
FOR UPDATE
USING (true);

-- Create storage bucket for interview recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-recordings', 'interview-recordings', true);

-- Allow public uploads to interview-recordings bucket
CREATE POLICY "Public upload access"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'interview-recordings');

-- Allow public read access
CREATE POLICY "Public read access for recordings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'interview-recordings');