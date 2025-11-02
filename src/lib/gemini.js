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
          
          // Set canvas dimensions
          canvas.width = img.width
          canvas.height = img.height
          
          // Draw image to canvas (this converts any format to canvas-compatible format)
          ctx.drawImage(img, 0, 0)
          
          // Convert canvas to base64 JPEG
          const base64Data = canvas.toDataURL('image/jpeg', 0.95).split(',')[1]
          
          resolve({
            base64: base64Data,
            mimeType: 'image/jpeg'
          })
        } catch (error) {
          reject(new Error('Failed to convert image: ' + error.message))
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = e.target.result
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
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
    // Convert image to JPEG format (handles HEIC and other unsupported formats)
    const { base64, mimeType } = await convertImageToJPEG(file)
    
    // Remove any whitespace from base64 string
    const cleanBase64 = base64.replace(/\s/g, '')
    
    if (!cleanBase64) {
      throw new Error('Empty image data after conversion')
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
      const error = await response.json()
      throw new Error(error.error || 'Failed to process image')
    }

    const data = await response.json()
    return data.text
  } catch (error) {
    throw error
  }
}

