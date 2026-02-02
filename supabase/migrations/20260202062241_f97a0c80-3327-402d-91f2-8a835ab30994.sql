-- Fix security issues for interviews table and storage bucket

-- 1. Add user_id column to interviews table to associate with authenticated users
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create interviews" ON public.interviews;
DROP POLICY IF EXISTS "Anyone can read interviews" ON public.interviews;
DROP POLICY IF EXISTS "Anyone can update interviews" ON public.interviews;

-- 3. Create secure RLS policies that require authentication
CREATE POLICY "Authenticated users can create their own interviews"
ON public.interviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own interviews"
ON public.interviews
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own interviews"
ON public.interviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interviews"
ON public.interviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Fix storage bucket - make it private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'interview-recordings';

-- 5. Drop existing public storage policies
DROP POLICY IF EXISTS "Public upload access" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for recordings" ON storage.objects;

-- 6. Create secure storage policies requiring authentication with user folder structure
CREATE POLICY "Authenticated users can upload their recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'interview-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'interview-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own recordings"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'interview-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 7. Add file size limit to storage bucket (100MB)
UPDATE storage.buckets 
SET file_size_limit = 104857600
WHERE id = 'interview-recordings';