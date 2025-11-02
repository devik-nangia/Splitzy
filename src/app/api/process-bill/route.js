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
          mimeType: mimeType || 'image/jpeg',
          data: imageData,
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

