'use client'

import { Button } from '@/components/ui/button'
import Star8 from '@/components/stars/s8'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { processImageWithGemini } from '@/lib/gemini'

export default function Home() {
  const router = useRouter()
  const [uploadedFile, setUploadedFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [billError, setBillError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleProcessBill = async () => {
    if (!uploadedFile) return

    setProcessing(true)
    setBillError(null)

    try {
      const response = await processImageWithGemini(uploadedFile)
      
      // Check if response is "NO"
      const trimmedResponse = response.trim().toUpperCase()
      if (trimmedResponse === 'NO') {
        setBillError('Bill could not be detected. Please ensure the bill picture is clear and all text is readable.')
        setProcessing(false)
        return
      }

      // Try to parse JSON response
      let parsedData
      try {
        // Clean the response - remove any markdown code blocks if present
        let jsonString = response.trim()
        
        // Remove markdown code blocks
        if (jsonString.includes('```json')) {
          jsonString = jsonString.replace(/```json[\s\S]*?```/g, '')
          const match = response.match(/```json\s*([\s\S]*?)\s*```/)
          if (match && match[1]) {
            jsonString = match[1].trim()
          }
        } else if (jsonString.includes('```')) {
          jsonString = jsonString.replace(/```[\s\S]*?```/g, '')
          const match = response.match(/```\s*([\s\S]*?)\s*```/)
          if (match && match[1]) {
            jsonString = match[1].trim()
          }
        }
        
        // Remove any leading/trailing text that's not JSON
        // Try to find JSON object boundaries
        const jsonStart = jsonString.indexOf('{')
        const jsonEnd = jsonString.lastIndexOf('}')
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonString = jsonString.substring(jsonStart, jsonEnd + 1)
        } else {
          // If no JSON boundaries found, try to extract JSON from the string
          const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            jsonString = jsonMatch[0]
          }
        }
        
        // Clean up any extra whitespace/newlines (but preserve structure)
        jsonString = jsonString.trim()
        
        parsedData = JSON.parse(jsonString)
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError)
        console.error('Parse error message:', parseError.message)
        console.error('JSON string attempted:', jsonString.substring(0, 200))
        console.error('Full response:', response)
        
        // Check if error message mentions pattern
        if (parseError.message && parseError.message.includes('pattern')) {
          setBillError(`Invalid response format from API. Error: ${parseError.message}. Please try uploading the bill again.`)
        } else {
          setBillError(`Failed to parse bill data: ${parseError.message}. Please try again or enter manually.`)
        }
        setProcessing(false)
        return
      }

      // Extract food items and tax
      const foodItems = []
      let taxAmount = ''

      Object.keys(parsedData).forEach(key => {
        if (key === 'tax_amount') {
          taxAmount = parsedData[key].toString()
        } else {
          // Food item: name is key, value is [quantity, price] array
          const itemValue = parsedData[key]
          if (Array.isArray(itemValue) && itemValue.length >= 2) {
            foodItems.push({
              name: key,
              quantity: itemValue[0].toString(),
              price: itemValue[1].toString(),
              people: []
            })
          } else {
            // Fallback: if not an array, treat as old format (just quantity)
            foodItems.push({
              name: key,
              quantity: itemValue.toString(),
              price: '',
              people: []
            })
          }
        }
      })

      // Store data in localStorage for items page
      const billData = {
        foodItems: foodItems.length > 0 ? foodItems : [{ name: '', quantity: '', price: '', people: [] }],
        taxAmount: taxAmount
      }
      localStorage.setItem('splitzy_bill_data', JSON.stringify(billData))

      // Redirect to items page
      router.push('/items')
    } catch (error) {
      console.error('Error processing bill:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      setBillError(`Failed to process bill: ${error.message || 'Unknown error'}`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center font-sans gap-10 justify-center flex-col ">
      <div className="top flex flex-col">
        <div className="relative inline-block">
          <Star8 size={45} className="absolute rotate-135 z-10 opacity-80 -top-4 -right-4" />
          <Star8 size={45} className="absolute opacity-80 rotate-45 z-10 -bottom-6 -left-6" />
          <h1 className="text-7xl font-bold bg-[#96d9ae]/50 pt-1 pb-5 px-2 flex items-center justify-center rounded-md relative">Splitzy</h1>
        </div>
        <p className="text-2xl mt-4 text-center">Splitting made easier.</p>
      </div>
      <div className="bottom w-full max-w-2xl px-4 flex flex-col items-center justify-center">
        <div className="bg-white/80 rounded-md border-2 border-black p-6 shadow-shadow w-[90%]">
          {/* Mode Toggle */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="w-full space-y-4">
              <h2 className="text-xl font-heading text-center">Upload Bill Photo</h2>
              
              {uploadedFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 p-4 border-2 border-black rounded-md bg-white/50">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-base text-sm md:text-base break-words">{uploadedFile.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="neutral" 
                      onClick={() => {
                        setUploadedFile(null)
                        setBillError(null)
                      }} 
                      className="flex-1"
                      disabled={processing}
                    >
                      Remove
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleProcessBill}
                      disabled={processing}
                    >
                      {processing ? 'Processing...' : 'Process Bill'}
                    </Button>
                  </div>
                  {billError && (
                    <div className="mt-4 flex items-start gap-2 p-3 bg-red-100/50 border-2 border-red-600 rounded-md">
                      <svg className="w-5 h-5 text-red-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <p className="text-sm font-base text-red-900">{billError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile: Simple Button */}
                  <div className="md:hidden">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button 
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Bill Photo
                    </Button>
                  </div>

                  {/* Desktop: Drag and Drop Area */}
                  <div
                    className="hidden md:block border-2 border-dashed border-black rounded-md p-8 text-center cursor-pointer hover:bg-[#96d9ae]/20 transition-colors"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="space-y-2">
                        <svg className="w-12 h-12 mx-auto text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="font-base">Click to upload or drag and drop</p>
                        <p className="text-sm opacity-70">PNG, JPG, or PDF up to 10MB</p>
                      </div>
                    </label>
                  </div>
                </>
              )}
              
              {/* Warning Message */}
              <div className="flex items-start gap-2 p-3 bg-yellow-100/50 border-2 border-yellow-600 rounded-md">
                <svg className="w-5 h-5 text-yellow-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-base text-yellow-900">Please ensure the bill picture is clear and all text is readable for accurate processing.</p>
              </div>
            </div>
            
            <p className="font-base text-sm opacity-100 text-center">or</p>
            <Link href="/items" className="w-full">
              <Button variant="neutral" className="w-full">
                Enter Manually
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
