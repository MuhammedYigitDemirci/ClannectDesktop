# Image Compression Implementation Guide

## Overview
This document describes the image compression system implemented to reduce storage usage while maintaining acceptable quality across all media types in the Clannect application.

## Compression Utility

A new compression utility has been created at `/src/lib/imageCompression.ts` with the following features:

### Available Functions

#### 1. `compressImage(file, maxWidth, maxHeight, quality)`
General-purpose image compression function.
- **Parameters:**
  - `file` (File): The image file to compress
  - `maxWidth` (number): Maximum width in pixels (default: 2000px)
  - `maxHeight` (number): Maximum height in pixels (default: 2000px)
  - `quality` (number): Quality level 0-1 (default: 0.85)
- **Returns:** Compressed image as Blob
- **Note:** Maintains aspect ratio automatically

#### 2. `compressAvatar(file)`
Optimized for profile avatars.
- **Dimensions:** 512x512px
- **Quality:** 0.9 (higher quality for clarity)
- **Use case:** Profile pictures where clarity is important

#### 3. `compressBanner(file)`
Optimized for profile banners.
- **Dimensions:** 2000x800px (wide aspect ratio)
- **Quality:** 0.85 (good balance)
- **Use case:** Banner images on profile pages

#### 4. `compressPostMedia(file)`
Optimized for post media.
- **Dimensions:** 1920x1920px
- **Quality:** 0.8 (balanced for sharing)
- **Use case:** Images and media in posts and messages

#### 5. `shouldCompress(file)`
Helper function to determine if compression is needed.
- **Threshold:** Only compresses files larger than 500KB
- **Returns:** boolean
- **Benefit:** Avoids unnecessary processing for already-small files

#### 6. `getFileSizeInMB(file)`
Utility function to get human-readable file sizes.
- **Returns:** String with file size in MB (2 decimal places)

## Compression Strategy

### Quality vs Size Trade-offs

| Media Type | Max Width | Max Height | Quality | Use Case |
|-----------|-----------|-----------|---------|----------|
| Avatar | 512px | 512px | 0.90 | Profile pictures |
| Banner | 2000px | 800px | 0.85 | Profile banners |
| Post Media | 1920px | 1920px | 0.80 | Posts & messages |

### How It Works

1. **Aspect Ratio Preservation:** Images are scaled proportionally to fit within max dimensions without distortion
2. **Format Optimization:**
   - PNG files maintain lossless compression
   - JPEG files use quality parameter (0-1) for lossy compression
3. **File Size Threshold:** Only files > 500KB are compressed to save processing time
4. **Error Handling:** If compression fails, the original file is uploaded as fallback

## Integration Points

### 1. Profile Page (`/src/app/profile/page.tsx`)
- **Avatar Upload:** Uses `compressAvatar()`
- **Banner Upload:** Uses `compressBanner()`
- Both triggered before uploading to Supabase storage

```typescript
if (shouldCompress(avatarFile)) {
  const compressedBlob = await compressAvatar(avatarFile)
  fileToUpload = new File([compressedBlob], ...)
}
```

### 2. Post Page (`/src/app/post/page.tsx`)
- **Post Media:** Uses `compressPostMedia()` for images
- Only compresses images; videos pass through unchanged
- Graceful fallback if compression fails

```typescript
if (formData.media.type.startsWith('image/') && shouldCompress(formData.media)) {
  const compressedBlob = await compressPostMedia(formData.media)
  fileToUpload = new File([compressedBlob], ...)
}
```

### 3. Conversation/Messages (`/src/app/conversation/[userId]/page.tsx`)
- **Message Media:** Uses `compressPostMedia()` for image attachments
- Same optimization as post media for consistency
- Handles both images and videos

```typescript
if (mediaFile.type.startsWith('image/') && shouldCompress(mediaFile)) {
  const compressedBlob = await compressPostMedia(mediaFile)
  fileToUpload = new File([compressedBlob], ...)
}
```

## Technology Used

### Canvas API
- **Built-in Browser API:** No external dependencies required
- **Method:** `canvas.toBlob()` for compression
- **Compatibility:** Works in all modern browsers
- **Performance:** Fast, client-side processing

### FileReader API
- Used for reading image files as Data URLs
- Creates Image object for dimension calculation

## Expected Storage Savings

Based on typical compression ratios:

| Media Type | Original Size | Compressed Size | Savings |
|-----------|---------------|-----------------|---------|
| Avatar (High-res) | ~2-5MB | ~0.3-0.8MB | 70-85% |
| Banner (High-res) | ~3-8MB | ~0.6-1.5MB | 70-80% |
| Post Image (High-res) | ~5-15MB | ~1-3MB | 70-85% |
| Message Image | ~2-10MB | ~0.4-2MB | 70-80% |

*Note: Actual savings depend on image quality, resolution, and format of original files*

## Quality Assurance

### Maintaining Quality
- Avatar/Banner: Higher quality (0.9/0.85) ensures profile pictures remain clear
- Post/Message Media: Balanced quality (0.8) for good appearance in social context
- Dimension limits prevent over-scaling while allowing flexibility

### Testing Recommendations
1. Upload high-resolution images and verify visual quality
2. Check file sizes before and after compression
3. Test with various image formats (PNG, JPEG, WebP)
4. Verify fallback behavior if compression fails

## Future Enhancements

### Video Compression
Currently videos pass through uncompressed. For future optimization:
- Consider using ffmpeg.wasm for client-side video encoding
- Set bitrate limits (e.g., 5Mbps for post videos)
- Requires additional dependency: `npm install @ffmpeg/ffmpeg`

### Progressive Compression
- Adjust quality based on device capabilities
- Lower quality for mobile, higher for desktop (if needed)

### Adaptive Quality
- Monitor user connection speed
- Adjust compression level based on network

## Troubleshooting

### Images Look Compressed/Pixelated
- Increase quality parameter (0.85 → 0.9)
- Check max dimensions aren't too small

### Compression Is Slow
- Increase the `shouldCompress()` threshold
- Current: 500KB, could increase to 1MB if acceptable

### Compression Fails
- Error handling automatically falls back to original file
- Check browser console for detailed error messages
- Ensure file is valid image format
