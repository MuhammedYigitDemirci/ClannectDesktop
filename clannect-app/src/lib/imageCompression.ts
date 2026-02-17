/**
 * Compress image while maintaining quality
 * Supports JPEG, PNG, WebP formats
 * @param file - The image file to compress
 * @param maxWidth - Maximum width (default: 2000px)
 * @param maxHeight - Maximum height (default: 2000px)
 * @param quality - Quality level 0-1 (default: 0.85 for good quality-to-size ratio)
 * @returns Compressed image blob
 */
export async function compressImage(
  file: File,
  maxWidth: number = 2000,
  maxHeight: number = 2000,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Determine output format and quality
        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const outputQuality = file.type === 'image/png' ? undefined : quality

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Canvas toBlob failed'))
            }
          },
          format,
          outputQuality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = event.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Compress avatar image with specific optimization for profile pictures
 * Smaller dimensions, higher quality for clarity
 * @param file - The avatar image file
 * @returns Compressed avatar blob
 */
export async function compressAvatar(file: File): Promise<Blob> {
  return compressImage(file, 512, 512, 0.9) // Smaller size, higher quality for avatars
}

/**
 * Compress banner image with specific optimization for banner aspect ratio
 * Wide dimension optimized for typical banner aspect ratios
 * @param file - The banner image file
 * @returns Compressed banner blob
 */
export async function compressBanner(file: File): Promise<Blob> {
  return compressImage(file, 2000, 800, 0.85) // Wide format, good quality
}

/**
 * Compress post media image
 * @param file - The post media image file
 * @returns Compressed post media blob
 */
export async function compressPostMedia(file: File): Promise<Blob> {
  return compressImage(file, 1920, 1920, 0.8) // Good quality for sharing
}

/**
 * Get file size in human readable format
 */
export function getFileSizeInMB(file: File | Blob): string {
  const sizeInMB = file.size / (1024 * 1024)
  return sizeInMB.toFixed(2)
}

/**
 * Check if compression would be beneficial
 * Only compress if file is larger than 500KB
 */
export function shouldCompress(file: File): boolean {
  return file.size > 500 * 1024 // 500KB threshold
}

/**
 * Delete a file from Supabase storage by URL
 * Extracts bucket and path from the public URL and deletes the file
 * @param publicUrl - The public URL of the file to delete
 * @param supabase - Supabase client instance
 * @returns Promise<boolean> - true if deleted successfully, false if file not found or error occurred
 */
export async function deleteFileFromStorage(publicUrl: string, supabase: any): Promise<boolean> {
  if (!publicUrl || !publicUrl.trim()) {
    console.log('🗑️ No URL provided for deletion')
    return true // No URL to delete
  }

  try {
    // Verify supabase client is available
    if (!supabase || !supabase.storage) {
      console.error('❌ Supabase client not available or storage not initialized')
      return false
    }

    console.log('🗑️ Starting deletion process for URL:', publicUrl)
    
    // Extract bucket name and file path from public URL
    // URL format: https://project-id.supabase.co/storage/v1/object/public/bucket-name/path/to/file
    const urlParts = publicUrl.split('/storage/v1/object/public/')
    console.log('🗑️ URL split successful, parts count:', urlParts.length)
    
    if (urlParts.length !== 2) {
      console.warn('❌ Invalid Supabase URL format. Expected /storage/v1/object/public/ in URL')
      console.warn('   Got URL:', publicUrl)
      return false
    }

    const pathWithoutDomain = urlParts[1]
    console.log('🗑️ Path without domain:', pathWithoutDomain)
    
    const pathParts = pathWithoutDomain.split('/')
    const bucketName = pathParts[0]
    const filePath = pathParts.slice(1).join('/')

    console.log('🗑️ Extracted - Bucket:', bucketName, '| File Path:', filePath)

    if (!bucketName || !filePath) {
      console.warn('❌ Missing bucket name or file path')
      console.warn('   Bucket:', bucketName, 'Path:', filePath)
      return false
    }

    // Verify this is a valid bucket
    if (!['avatars', 'banners', 'post-media', 'message-media'].includes(bucketName)) {
      console.warn('⚠️ Unknown bucket name:', bucketName)
      // Still try to delete anyway
    }

    // Delete the file
    console.log('🗑️ Attempting to call supabase.storage.from("' + bucketName + '").remove(["' + filePath + '"])')
    
    const { error, data } = await supabase.storage
      .from(bucketName)
      .remove([filePath])

    console.log('🗑️ Supabase response received. Error:', error, 'Data:', data)

    if (error) {
      console.warn(`⚠️ Supabase deletion returned an error:`)
      console.warn(`   Bucket: ${bucketName}`)
      console.warn(`   Path: ${filePath}`)
      console.warn(`   Error: ${error.message || JSON.stringify(error)}`)
      return false
    }

    console.log(`✅ Successfully deleted file: ${filePath} from bucket ${bucketName}`)
    return true
  } catch (error) {
    console.error('❌ Exception thrown while deleting file from storage:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    return false
  }
}
