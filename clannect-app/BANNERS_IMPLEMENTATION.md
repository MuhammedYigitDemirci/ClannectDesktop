# Banners Implementation Guide

## Overview
This document explains the banner feature added to user profiles, including the SQL setup and frontend implementation.

## SQL Setup

### 1. Add `banner_url` Column to Profiles Table
The `BANNERS_SETUP.sql` file contains the migration to add the `banner_url` column:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS banner_url TEXT;
```

### 2. Storage RLS Policies
The banners bucket requires the following RLS policies:

- **Upload Policy**: Authenticated users can upload to their own folder
- **View Policy**: Anyone can view/download banners (public)
- **Update Policy**: Users can only update their own banners
- **Delete Policy**: Users can only delete their own banners

All policies use the folder structure: `{user_id}/{filename}` to keep users' banners separate.

### Deployment Steps

1. **Supabase Dashboard**:
   - Go to SQL Editor
   - Create a new query
   - Copy and paste the contents of `BANNERS_SETUP.sql`
   - Run the query

2. **Storage Bucket**:
   - Create a bucket named "banners" in Storage
   - Make sure it's NOT public (RLS policies will handle access)
   - The policies in `BANNERS_SETUP.sql` set up the access rules

## Frontend Implementation

### Features

1. **Banner Display**:
   - Shows user's custom banner image if available
   - Falls back to gradient if no banner is set
   - Responsive sizing: 192px on mobile (h-48), 256px on desktop (h-64)

2. **Edit Mode** (Own Profile Only):
   - Hover over banner in edit mode to see "Add Banner" or "Change Banner" button
   - Click to upload a new banner
   - Maximum file size: 5MB
   - Supports all image formats (jpg, png, webp, etc.)

3. **Public Profile**:
   - Shows banner without edit capability
   - Users can only see others' banners, not edit them

### Files Modified

1. **src/app/profile/page.tsx**:
   - Added `bannerFile` and `bannerPreview` state variables
   - Added `handleBannerChange()` function for file selection
   - Added `uploadBanner()` function for uploading to Supabase storage
   - Updated Profile interface to include `banner_url`
   - Updated banner display with conditional rendering (image or gradient)
   - Added hover overlay in edit mode for banner management

2. **src/app/profile/[username]/page.tsx**:
   - Updated Profile interface to include `banner_url`
   - Updated banner display to show image if available, otherwise gradient
   - Read-only banner view (no edit capability)

### How It Works

#### Upload Process
1. User selects a banner image in edit mode
2. Image is validated for size (max 5MB)
3. Image is uploaded to Supabase storage (`banners` bucket)
4. Upload path: `{user_id}-{timestamp}.{extension}`
5. Public URL is generated and saved to database
6. Profile is refetched to display the new banner
7. Upload state is cleared

#### Database Storage
- Banner URL is stored in `profiles.banner_url` column
- NULL if no banner is set
- Automatically falls back to gradient in UI

#### RLS Security
- Users can only upload to their own folder (enforced by `{user_id}` in path)
- Anyone can view banners (READ policy is permissive)
- Users can only update/delete their own banners
- Tried to delete a user's banners when account is deleted (CASCADE)

## Usage

### For Users

1. **Upload a Banner**:
   - Go to your profile page
   - Click "Edit Profile"
   - Hover over the banner area
   - Click "Add Banner" (if no banner) or "Change Banner" (if existing)
   - Select an image file (max 5MB)
   - Wait for upload to complete
   - Click "Save Changes" to finalize

2. **View Banners**:
   - Your own profile shows the banner you uploaded
   - Public profiles show banners if users have uploaded them
   - Banners fall back to gradient if not set

### For Developers

1. **Database Query Example**:
```sql
-- Fetch profile with banner
SELECT id, username, display_name, avatar_url, banner_url, banner_gradient
FROM profiles
WHERE id = '{user_id}';
```

2. **Display Logic**:
```tsx
{profile.banner_url && profile.banner_url.trim() ? (
  <img src={profile.banner_url} alt="Banner" />
) : (
  <div className={`bg-gradient-to-br ${profile.banner_gradient}`}></div>
)}
```

## Technical Details

### Storage Path Structure
```
banners/
  ├── {user_id_1}-{timestamp1}.jpg
  ├── {user_id_1}-{timestamp2}.jpg
  └── {user_id_2}-{timestamp3}.png
```

### File Size Limits
- Maximum: 5MB (enforced on client side)
- Recommended: Under 2MB for better performance

### Supported Image Formats
- JPG/JPEG
- PNG
- WebP
- GIF
- etc. (any format supported by browsers)

## Security Considerations

1. **RLS Policies**: 
   - Prevent users from uploading to other users' folders
   - Allow public viewing of banners
   - Prevent unauthorized updates/deletions

2. **File Size Validation**:
   - Client-side check: 5MB limit
   - Server-side: enforced by Supabase storage limits

3. **File Type Validation**:
   - Client-side: `accept="image/*"`
   - Server-side: no additional validation (accept any image)

## Troubleshooting

### Banner Not Displaying
1. Check if `banner_url` is populated in database
2. Verify Supabase storage bucket exists and is named "banners"
3. Ensure RLS policies are applied
4. Check browser console for CORS errors

### Upload Fails
1. Check file size (must be < 5MB)
2. Verify user is authenticated
3. Check RLS policies are correctly applied
4. Verify `profiles` table has `banner_url` column

### RLS Policies Not Working
1. Ensure all policies from `BANNERS_SETUP.sql` are applied
2. Check policy syntax in Supabase dashboard
3. Verify bucket is not marked as public (should use RLS)
4. Clear browser cache and retry

## Future Enhancements

- Banner cropping tool before upload
- Banner filters/effects
- Multiple banner options
- Banner rotation/scheduling
- Blur NSFW banners
- Banner usage statistics
