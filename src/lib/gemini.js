/**
 * Process an image using Gemini API
 * @param {File} file - The image file to process
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {Promise<string>} - The response text from Gemini
 */
export async function processImageWithGemini(file, prompt) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async () => {
      try {
        // Get base64 data (remove data:image/jpeg;base64, prefix)
        const base64Data = reader.result.split(',')[1]
        const mimeType = file.type || 'image/jpeg'

        // Send to API route
        const response = await fetch('/api/process-bill', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData: base64Data,
            mimeType: mimeType,
            prompt: `I am giving you a photo of a restaurant bill, all you need to do is give me the response i am asking for and NOTHING ELSE (no sures, no hello his, no thank you, no filler worlds). if you can't see the contents of the bill (the food items, their quantity, and price, total amount) then reply with one word which is "NO", nothing else just a "NO" is required from you, otherwise, give me a response in json format with the item name: [quantity, price] and the last key pair in your response should be tax_amount: and the tax amount in the bill, i dont need anything else except this content in JSON format no filler words are required.`,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to process image')
        }

        const data = await response.json()
        resolve(data.text)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    // Read file as base64
    reader.readAsDataURL(file)
  })
}

