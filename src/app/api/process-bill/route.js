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

    return NextResponse.json({
      text: response.text,
      success: true,
    })
  } catch (error) {
    console.error('Error processing bill:', error)
    return NextResponse.json(
      { error: 'Failed to process bill', details: error.message },
      { status: 500 }
    )
  }
}

