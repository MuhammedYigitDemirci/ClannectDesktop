-- ============================================
-- BANNERS SETUP
-- ============================================

-- Add banner_url column to profiles table (if not exists)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- ============================================
-- STORAGE RLS POLICIES FOR BANNERS BUCKET
-- ============================================

-- Users can upload banners only to their own folder
CREATE POLICY "Authenticated users can upload banners" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'banners' AND
    auth.role() = 'authenticated'
  );

-- Anyone can view/download banners
CREATE POLICY "Anyone can view banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

-- Users can update/delete only their own banners
CREATE POLICY "Users can update own banners" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'banners' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own banners" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'banners' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
