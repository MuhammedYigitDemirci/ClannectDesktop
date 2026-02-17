# Avatar/Banner Deletion Debugging Guide

## Problem
Old avatar and banner files are not being deleted from Supabase storage when users upload new ones.

## Solution Implemented
Added comprehensive console logging at all critical points in the avatar and banner upload process to identify where the deletion fails.

## Files Modified
1. **src/app/profile/page.tsx** - uploadAvatar() and uploadBanner() functions
2. **src/lib/imageCompression.ts** - deleteFileFromStorage() function

## Console Logging Points

### In uploadAvatar() (profile/page.tsx, lines 125-176):
```
📷 Uploading new avatar. Old URL: [URL]   -- Captures old avatar URL from profile state
✅ New avatar uploaded. New URL: [URL]    -- Confirms new avatar uploaded successfully
🗑️ Attempting to delete old avatar: [URL] -- Shows we're about to delete old file
✅ Old avatar deleted successfully        -- Deletion worked (if shown)
⚠️ Old avatar could not be deleted        -- Deletion failed (if shown)
```

### In uploadBanner() (profile/page.tsx, lines 184-225):
```
🖼️ Uploading new banner. Old URL: [URL]   -- Captures old banner URL from profile state
✅ New banner uploaded. New URL: [URL]    -- Confirms new banner uploaded successfully
🗑️ Attempting to delete old banner: [URL] -- Shows we're about to delete old file
✅ Old banner deleted successfully        -- Deletion worked (if shown)
⚠️ Old banner could not be deleted        -- Deletion failed (if shown)
```

### In deleteFileFromStorage() (imageCompression.ts, lines 131-197):
FIRST, you'll see these validation checks:
```
❌ Supabase client not available or storage not initialized  -- Supabase not ready
🗑️ Starting deletion process for URL: [URL]                 -- Process started
🗑️ URL split successful, parts count: 2                     -- URL parsed correctly
🗑️ Path without domain: [bucket/path/to/file]              -- Extracted file path
🗑️ Extracted - Bucket: [bucket] | File Path: [path]         -- What will be deleted
⚠️ Unknown bucket name: [bucket]                            -- Bucket name not recognized
```

THEN, the actual deletion attempt:
```
🗑️ Attempting to call supabase.storage.from("[bucket]").remove(["[path]"])  -- Making API call
🗑️ Supabase response received. Error: [null or error] Data: [array or null]  -- API responded
✅ Successfully deleted file: [path] from bucket [bucket]   -- Delete succeeded

# OR if there's an error:
❌ Invalid Supabase URL format. Expected /storage/v1/object/public/ in URL
❌ Missing bucket name or file path
⚠️ Supabase deletion returned an error: [details]
❌ Exception thrown while deleting file from storage: [exception details]
```

## How to Test

### Step 1: Start Dev Server
```bash
cd "c:\Users\hatic\OneDrive\Desktop\Clannect APP\clannect-app"
npm run dev
```

### Step 2: Open Browser Dev Tools
- Navigate to http://localhost:3000/profile (or 3001 if port 3000 is in use)
- Press F12 to open Developer Tools
- Go to "Console" tab

### Step 3: Test Avatar Deletion
1. Click "Edit Profile" button
2. Click the camera icon on the avatar to upload a new image
3. Select an image file
4. Click "Save Profile" button
5. **Check Console Output** - You should see:
   ```
   📷 Uploading new avatar. Old URL: https://...
   ✅ New avatar uploaded. New URL: https://...
   🗑️ Attempting to delete old avatar: https://...
   🗑️ Parsing URL for deletion: https://...
   🗑️ URL parts after split: 2 [...]
   🗑️ Extracted bucket: avatars path: user-id-timestamp.png
   🗑️ Calling supabase.storage.from().remove() with path: [path]
   ✅ Successfully deleted old file: [path] from bucket avatars
   ```

### Step 4: Test Banner Deletion
1. Same as above but click the camera icon on the banner area
2. Check console for similar `🖼️` logs for banner deletion

## What to Look For

### ✅ If You See All Logs Including the SUCCESS Message:
The deletion is working! Check Supabase Storage directly:
1. Go to Supabase Dashboard → Storage → avatars bucket
2. Verify old avatar file is actually gone

### ❌ If Logs Stop at "URL parts after split":
The URL parsing is failing. The URL format might be different than expected.
- Capture the URL from console and check its structure
- It should be: `https://[project].supabase.co/storage/v1/object/public/avatars/[filename]`

### ❌ If Logs Stop at "Calling supabase.storage.from().remove()":
The Supabase API call is failing. Check:
- Supabase RLS policies for storage bucket
- Whether the supabase client is authenticated properly
- Error message in console (if displayed)

### ❌ If "Attempting to delete" Log Never Appears:
The oldAvatarUrl is probably empty or undefined:
- Check if profile state is loaded correctly
- Verify profile.avatar_url has a value before clicking Save

## Expected Flow

```
User uploads new avatar
    ↓
uploadAvatar() captures oldAvatarUrl from profile state
    ↓
Compress avatar (if > 500KB)
    ↓
Upload new avatar to Supabase storage
    ↓
Get public URL of new avatar
    ↓
Update database with new URL
    ↓
Call deleteFileFromStorage(oldAvatarUrl, supabase)
    ↓
Parse URL to extract bucket and file path
    ↓
Call supabase.storage.from(bucket).remove([filePath])
    ↓
Old file deleted from storage
```

## Database Impact
The avatar_url and banner_url columns in the profiles table are updated immediately after new files are uploaded, even if the old file deletion fails. This means:
- ✅ New avatars/banners display correctly (database updated)
- ❌ Old files might remain in storage (cleanup failed)

This is safe but wastes storage space.

## Next Steps
1. Run dev server and test the avatar/banner upload
2. Check console logs to identify where the process stops
3. Report which log point is missing or shows an error
4. Based on the logs, we can identify and fix the root cause
