import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export async function POST(request) {
  try {
    const { imageData, mimeType, prompt } = await request.json()

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Validate and clean base64 data
    let cleanImageData = imageData.toString().trim()
    // Remove any whitespace or line breaks
    cleanImageData = cleanImageData.replace(/\s/g, '')
    
    // Validate base64 format
    const base64Regex = /^[A-Za-z0-9+/=]+$/
    if (!base64Regex.test(cleanImageData)) {
      return NextResponse.json(
        { error: 'Invalid image data format' },
        { status: 400 }
      )
    }

    // Normalize MIME type
    let normalizedMimeType = mimeType || 'image/jpeg'
    if (!normalizedMimeType.startsWith('image/')) {
      normalizedMimeType = 'image/jpeg'
    }
    
    // Ensure supported MIME type
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!supportedTypes.includes(normalizedMimeType.toLowerCase())) {
      normalizedMimeType = 'image/jpeg'
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
    })

    // Ensure base64 string doesn't have any invalid characters
    // Remove any characters that aren't valid base64 (keep padding =)
    cleanImageData = cleanImageData.replace(/[^A-Za-z0-9+/=]/g, '')
    
    // Fix base64 padding if needed (base64 strings must be multiples of 4)
    const remainder = cleanImageData.length % 4
    if (remainder !== 0) {
      // Add padding if needed
      cleanImageData += '='.repeat(4 - remainder)
    }

    // Test if base64 can be decoded (basic validation)
    try {
      Buffer.from(cleanImageData, 'base64')
    } catch (decodeError) {
      console.error('Base64 decode test failed:', decodeError)
      return NextResponse.json(
        { error: 'Invalid base64 image data format' },
        { status: 400 }
      )
    }

    // Log image data info for debugging (without logging full base64)
    console.log('Image data length:', cleanImageData.length)
    console.log('MIME type:', normalizedMimeType)
    console.log('Base64 validation passed')

    try {
      const contents = [
        {
          inlineData: {
            mimeType: normalizedMimeType,
            data: cleanImageData,
          },
        },
        { text: prompt },
      ]

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
      })

      // Handle response - check the actual response structure
      let responseText = ''
      
      // Try multiple ways to extract text based on Gemini SDK version
      try {
        // Method 1: Direct text property (string)
        if (typeof response.text === 'string') {
          responseText = response.text
        }
        // Method 2: Text as async function
        else if (response.text && typeof response.text === 'function') {
          responseText = await response.text()
        }
        // Method 3: Response object with text
        else if (response.response) {
          if (typeof response.response.text === 'function') {
            responseText = await response.response.text()
          } else if (typeof response.response.text === 'string') {
            responseText = response.response.text
          } else if (response.response.candidates && response.response.candidates[0]) {
            const candidate = response.response.candidates[0]
            if (candidate.content && candidate.content.parts) {
              responseText = candidate.content.parts.map(p => p.text).join('')
            }
          }
        }
        // Method 4: Candidates structure
        else if (response.candidates && response.candidates[0]) {
          const candidate = response.candidates[0]
          if (candidate.content && candidate.content.parts) {
            responseText = candidate.content.parts.map(p => p.text || '').join('')
          } else if (candidate.text) {
            responseText = candidate.text
          }
        }
        // Method 5: Fallback - try to stringify and extract
        else {
          console.warn('Unexpected response structure, attempting to extract text')
          const responseStr = JSON.stringify(response)
          const textMatch = responseStr.match(/"text":\s*"([^"]+)"/)
          if (textMatch) {
            responseText = textMatch[1]
          } else {
            responseText = responseStr
          }
        }

        if (!responseText || responseText.trim().length === 0) {
          throw new Error('Empty response from Gemini API')
        }
      } catch (extractError) {
        console.error('Error extracting response text:', extractError)
        throw new Error('Failed to extract response from Gemini API: ' + extractError.message)
      }

      return NextResponse.json({
        text: responseText,
        success: true,
      })
    } catch (apiError) {
      console.error('Gemini API error:', apiError)
      console.error('Error message:', apiError.message)
      console.error('Error stack:', apiError.stack)
      
      // Check if it's a validation error from Gemini
      if (apiError.message && apiError.message.includes('pattern')) {
        return NextResponse.json(
          { error: 'Invalid image format. Please ensure the image is in JPEG, PNG, or WebP format.' },
          { status: 400 }
        )
      }
      
      throw apiError
    }
  } catch (error) {
    console.error('Error processing bill:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { error: 'Failed to process bill', details: error.message },
      { status: 500 }
    )
  }
}

