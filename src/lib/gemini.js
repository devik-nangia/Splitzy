/**
 * Convert image to JPEG format using canvas (handles HEIC and other formats)
 * @param {File} file - The image file to convert
 * @returns {Promise<{base64: string, mimeType: string}>} - Base64 data and MIME type
 */
function convertImageToJPEG(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          // Create canvas to convert image
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Calculate max dimensions (Gemini API has limits, use smaller size for better compatibility)
          const maxDimension = 2048 // Reduced from 4096 to ensure compatibility
          let width = img.width
          let height = img.height
          
          if (width > maxDimension || height > maxDimension) {
            const scale = Math.min(maxDimension / width, maxDimension / height)
            width = Math.floor(width * scale)
            height = Math.floor(height * scale)
          }
          
          // Set canvas dimensions
          canvas.width = width
          canvas.height = height
          
          // Draw image to canvas (this converts any format to canvas-compatible format)
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convert canvas to base64 JPEG with quality 0.85 (slightly lower to reduce size)
          const base64Data = canvas.toDataURL('image/jpeg', 0.85)
          
          // Extract base64 part
          if (!base64Data || !base64Data.includes(',')) {
            throw new Error('Failed to generate base64 data')
          }
          
          let base64String = base64Data.split(',')[1]
          
          if (!base64String || base64String.length === 0) {
            throw new Error('Empty base64 data generated')
          }
          
          // Clean base64 string - remove any potential issues
          base64String = base64String.replace(/\s/g, '').replace(/\n/g, '').replace(/\r/g, '')
          
          // Validate base64 length is reasonable (not too large)
          const maxBase64Size = 20 * 1024 * 1024 // ~20MB base64 (roughly 15MB image)
          if (base64String.length > maxBase64Size) {
            // If too large, reduce quality further
            const reducedQualityBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
            base64String = reducedQualityBase64.replace(/\s/g, '')
            
            if (base64String.length > maxBase64Size) {
              // Still too large, scale down more
              const smallScale = Math.min(1536 / width, 1536 / height)
              const smallWidth = Math.floor(width * smallScale)
              const smallHeight = Math.floor(height * smallScale)
              canvas.width = smallWidth
              canvas.height = smallHeight
              ctx.drawImage(img, 0, 0, smallWidth, smallHeight)
              base64String = canvas.toDataURL('image/jpeg', 0.7).split(',')[1].replace(/\s/g, '')
            }
          }
          
          resolve({
            base64: base64String,
            mimeType: 'image/jpeg'
          })
        } catch (error) {
          reject(new Error('Failed to convert image: ' + error.message))
        }
      }

      img.onerror = (error) => {
        // If image fails to load (e.g., HEIC), try using the original base64 data if it's a supported format
        console.warn('Image failed to load in Image element, checking if format is supported')
        try {
          const result = e.target.result
          if (result && typeof result === 'string' && result.includes(',')) {
            let base64Data = result.split(',')[1].replace(/\s/g, '').replace(/\n/g, '').replace(/\r/g, '')
            const mimeTypeMatch = result.split(',')[0].match(/data:([^;]+)/)
            const originalMimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg'
            
            // Check if it's HEIC/HEIF - these can't be sent directly to Gemini
            if (originalMimeType.includes('heic') || originalMimeType.includes('heif')) {
              reject(new Error('HEIC/HEIF format is not supported. Please convert your image to JPEG or PNG format first. On iPhone, you can change the camera settings to use "Most Compatible" format.'))
              return
            }
            
            // If it's already a supported format, use it directly
            if (originalMimeType.includes('jpeg') || originalMimeType.includes('png') || originalMimeType.includes('webp')) {
              resolve({
                base64: base64Data,
                mimeType: originalMimeType.includes('jpeg') ? 'image/jpeg' : originalMimeType
              })
              return
            }
          }
        } catch (err) {
          console.error('Error in fallback:', err)
        }
        reject(new Error('Failed to load image. The image format may not be supported. Please try converting to JPEG or PNG format.'))
      }

      // Don't set crossOrigin for data URLs as it can cause issues
      img.src = e.target.result
    }

    reader.onerror = (error) => {
      reject(new Error('Failed to read file: ' + (error.message || 'Unknown error')))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Process an image using Gemini API
 * @param {File} file - The image file to process
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {Promise<string>} - The response text from Gemini
 */
export async function processImageWithGemini(file, prompt) {
  try {
    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error('Image is too large. Please use an image smaller than 10MB.')
    }

    // Convert image to JPEG format (handles HEIC and other unsupported formats)
    const { base64, mimeType } = await convertImageToJPEG(file)
    
    // Remove any whitespace from base64 string
    const cleanBase64 = base64.replace(/\s/g, '').replace(/\n/g, '').replace(/\r/g, '')
    
    if (!cleanBase64) {
      throw new Error('Empty image data after conversion')
    }

    // Validate base64 length
    if (cleanBase64.length < 100) {
      throw new Error('Image data is too small')
    }

    // Send to API route
    const response = await fetch('/api/process-bill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: cleanBase64,
        mimeType: mimeType,
        prompt: `I am giving you a photo of a restaurant bill, all you need to do is give me the response i am asking for and NOTHING ELSE (no sures, no hello his, no thank you, no filler worlds). if you can't see the contents of the bill (the food items, their quantity, and price, total amount) then reply with one word which is "NO", nothing else just a "NO" is required from you, otherwise, give me a response in json format with the item name: [quantity, price] and the last key pair in your response should be tax_amount: and the tax amount in the bill, i dont need anything else except this content in JSON format no filler words are required.`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      const errorMsg = errorData.error || errorData.details || 'Failed to process image'
      console.error('API error response:', errorData)
      throw new Error(errorMsg)
    }

    const data = await response.json()
    if (!data.success) {
      console.error('API returned unsuccessful:', data)
      throw new Error(data.error || 'Failed to process image')
    }
    return data.text
  } catch (error) {
    throw error
  }
}

