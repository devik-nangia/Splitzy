'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Star8 from '@/components/stars/s8'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ItemsPage() {
  const router = useRouter()
  const [numberOfPeople, setNumberOfPeople] = useState('')
  const [peopleNames, setPeopleNames] = useState([])
  const [foodItems, setFoodItems] = useState([{ name: '', quantity: '', price: '', people: [] }])
  const [taxAmount, setTaxAmount] = useState('')
  const [payments, setPayments] = useState([])

  // Load bill data from localStorage on mount
  useEffect(() => {
    const billData = localStorage.getItem('splitzy_bill_data')
    if (billData) {
      try {
        const parsed = JSON.parse(billData)
        if (parsed.foodItems && parsed.foodItems.length > 0) {
          setFoodItems(parsed.foodItems)
        }
        if (parsed.taxAmount) {
          setTaxAmount(parsed.taxAmount)
        }
        // Clear the bill data after loading to prevent reloading on refresh
        localStorage.removeItem('splitzy_bill_data')
      } catch (error) {
        console.error('Failed to parse bill data:', error)
      }
    }
  }, [])

  // Initialize people names array when numberOfPeople changes
  useEffect(() => {
    if (numberOfPeople && parseInt(numberOfPeople) > 0) {
      const count = parseInt(numberOfPeople)
      if (peopleNames.length !== count) {
        setPeopleNames(Array(count).fill(''))
      }
    } else {
      setPeopleNames([])
    }
  }, [numberOfPeople])

  // Initialize payments array when peopleNames are set
  useEffect(() => {
    if (peopleNames.length > 0 && peopleNames.every(name => name.trim() !== '')) {
      setPayments(peopleNames.map(name => ({ person: name, paid: false, amount: '' })))
    }
  }, [peopleNames])

  const updatePersonName = (index, value) => {
    const updated = [...peopleNames]
    updated[index] = value
    setPeopleNames(updated)
  }

  const arePeopleNamesComplete = () => {
    return peopleNames.length > 0 && peopleNames.every(name => name.trim() !== '')
  }

  const addFoodItem = () => {
    setFoodItems([...foodItems, { name: '', quantity: '', price: '', people: [] }])
  }

  const removeFoodItem = (index) => {
    setFoodItems(foodItems.filter((_, i) => i !== index))
  }

  const updateFoodItem = (index, field, value) => {
    const updated = [...foodItems]
    updated[index][field] = value
    setFoodItems(updated)
  }

  const togglePersonInFoodItem = (itemIndex, personName) => {
    const updated = [...foodItems]
    const item = updated[itemIndex]
    if (item.people.includes(personName)) {
      item.people = item.people.filter(p => p !== personName)
    } else {
      item.people = [...item.people, personName]
    }
    setFoodItems(updated)
  }

  const calculateSubtotal = () => {
    return foodItems.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0
      const price = parseFloat(item.price) || 0
      return total + (quantity * price)
    }, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = parseFloat(taxAmount) || 0
    return subtotal + tax
  }

  const togglePayment = (index) => {
    const updated = [...payments]
    updated[index].paid = !updated[index].paid
    if (!updated[index].paid) {
      updated[index].amount = ''
    }
    setPayments(updated)
  }

  const updatePayment = (index, amount) => {
    const updated = [...payments]
    updated[index].amount = amount
    setPayments(updated)
  }

  const calculateTotalPaid = () => {
    return payments.reduce((total, payment) => {
      if (payment.paid) {
        const amount = parseFloat(payment.amount) || 0
        return total + amount
      }
      return total
    }, 0)
  }

  const doPaymentsMatchTotal = () => {
    const totalPaid = calculateTotalPaid()
    const total = calculateTotal()
    return Math.abs(totalPaid - total) < 0.01 // Allow small floating point differences
  }

  const handleCalculate = () => {
    // Store data in localStorage to pass to split page
    const dataToStore = {
      peopleNames,
      foodItems: foodItems.filter(item => item.name && item.price), // Only valid items
      taxAmount,
      payments: payments.filter(p => p.paid), // Only people who paid
      total: calculateTotal(),
      subtotal: calculateSubtotal()
    }
    localStorage.setItem('splitzy_data', JSON.stringify(dataToStore))
    // Navigate to split page
    router.push('/split')
  }

  const totalPrice = calculateTotal()
  const isFoodItemsUnlocked = arePeopleNamesComplete()
  const totalPaid = calculateTotalPaid()
  const paymentsMatch = doPaymentsMatchTotal()

  return (
    <div className="flex min-h-screen items-center font-sans gap-10 flex-col py-10">
      <div className="top flex flex-col">
        <div className="relative inline-block">
          <Star8 size={45} className="absolute rotate-135 z-10 opacity-80 -top-4 -right-4" />
          <Star8 size={45} className="absolute opacity-80 rotate-45 z-10 -bottom-6 -left-6" />
          <h1 className="text-7xl font-bold bg-[#96d9ae]/50 pt-1 pb-5 px-2 flex items-center justify-center rounded-md relative">Splitzy</h1>
        </div>
        <p className="text-2xl mt-4 text-center">Splitting made easier.</p>
      </div>
      <div className="bottom w-full max-w-6xl px-4 flex flex-col items-center justify-center gap-6">
        
        {/* Section 1: Number of People */}
        <div className="w-full">
          <div className="bg-white/80 rounded-md border-2 border-black p-6 shadow-shadow w-full">
            <div className="space-y-4">
              <h2 className="text-xl font-heading text-center">How many people were involved?</h2>
              <input
                type="number"
                value={numberOfPeople}
                onChange={(e) => setNumberOfPeople(e.target.value)}
                onWheel={(e) => e.target.blur()}
                placeholder="Enter number"
                min="1"
                className="w-full px-3 py-2 border-2 border-black rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </div>

        {/* Section 2: People Names */}
        {numberOfPeople && parseInt(numberOfPeople) > 0 && (
          <div className="w-full">
            <div className="bg-white/80 rounded-md border-2 border-black p-6 shadow-shadow w-full">
              <div className="space-y-4">
                <h2 className="text-xl font-heading text-center">Enter People Names</h2>
                <div className="space-y-3">
                  {peopleNames.map((name, index) => (
                    <div key={index}>
                      <label className="block text-sm mb-1 font-base">Person {index + 1}</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => updatePersonName(index, e.target.value)}
                        placeholder={`Person ${index + 1} name`}
                        className="w-full px-3 py-2 border-2 border-black rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Food Items (Locked until names are complete) */}
        <div className="w-full">
          <div className={`bg-white/80 rounded-md border-2 border-black p-6 shadow-shadow w-full ${!isFoodItemsUnlocked ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-heading">Food Items</h2>
            </div>
            <div className="space-y-4">
              {foodItems.map((item, index) => (
                <div key={index} className="p-4 border-2 border-black rounded-base space-y-3">
                  {/* Item Name - Full width on mobile, part of row on desktop */}
                  <div className="md:hidden">
                    <label className="block text-sm mb-1 font-base">Item Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateFoodItem(index, 'name', e.target.value)}
                      placeholder="e.g., Pizza"
                      className="w-full px-3 py-2 border-2 border-black rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-black"
                      disabled={!isFoodItemsUnlocked}
                    />
                  </div>
                  
                  {/* Desktop: All in one row */}
                  <div className="hidden md:flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm mb-1 font-base">Item Name</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateFoodItem(index, 'name', e.target.value)}
                        placeholder="e.g., Pizza"
                        className="w-full px-3 py-2 border-2 border-black rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-black"
                        disabled={!isFoodItemsUnlocked}
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-sm mb-1 font-base">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateFoodItem(index, 'quantity', e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        placeholder="1"
                        min="1"
                        step="1"
                        className="w-full px-3 py-2 border-2 border-black rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-black"
                        disabled={!isFoodItemsUnlocked}
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm mb-1 font-base">Price</label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateFoodItem(index, 'price', e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border-2 border-black rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-black"
                        disabled={!isFoodItemsUnlocked}
                      />
                    </div>
                    {foodItems.length > 1 && (
                      <Button
                        variant="neutral"
                        size="icon"
                        onClick={() => removeFoodItem(index)}
                        disabled={!isFoodItemsUnlocked}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    )}
                  </div>

                  {/* Mobile: Quantity and Price in same row */}
                  <div className="flex md:hidden gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm mb-1 font-base">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateFoodItem(index, 'quantity', e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        placeholder="1"
                        min="1"
                        step="1"
                        className="w-full px-3 py-2 border-2 border-black rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-black"
                        disabled={!isFoodItemsUnlocked}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm mb-1 font-base">Price</label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateFoodItem(index, 'price', e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border-2 border-black rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-black"
                        disabled={!isFoodItemsUnlocked}
                      />
                    </div>
                    {foodItems.length > 1 && (
                      <Button
                        variant="neutral"
                        size="icon"
                        onClick={() => removeFoodItem(index)}
                        disabled={!isFoodItemsUnlocked}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm mb-2 font-base">Who had this item?</label>
                    <div className="flex flex-wrap gap-2">
                      {peopleNames.map((personName, personIndex) => (
                        <button
                          key={personIndex}
                          type="button"
                          onClick={() => togglePersonInFoodItem(index, personName)}
                          disabled={!isFoodItemsUnlocked || !personName.trim()}
                          className={`px-3 py-1 rounded-base border-2 border-black text-sm font-base transition-all ${
                            item.people.includes(personName)
                              ? 'bg-main text-main-foreground'
                              : 'bg-white hover:bg-[#96d9ae]/20'
                          } ${!isFoodItemsUnlocked || !personName.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {personName || `Person ${personIndex + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              variant="neutral" 
              onClick={addFoodItem} 
              className="w-full"
              disabled={!isFoodItemsUnlocked}
            >
              + Add Item
            </Button>
          </div>
          </div>
        </div>

        {/* Section 4: Tax and Total Price Display */}
        {isFoodItemsUnlocked && foodItems.some(item => item.name && item.price) && (
          <div className="w-full">
            <div className="bg-white/80 rounded-md border-2 border-black p-6 shadow-shadow w-full">
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1 font-base">Tax Amount</label>
                <input
                  type="number"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border-2 border-black rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-base">Subtotal</TableCell>
                      <TableCell className="text-right">₹{calculateSubtotal().toFixed(2)}</TableCell>
                    </TableRow>
                    {taxAmount && parseFloat(taxAmount) > 0 && (
                      <TableRow>
                        <TableCell className="font-base">Tax</TableCell>
                        <TableCell className="text-right">₹{parseFloat(taxAmount).toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-heading">Total</TableCell>
                      <TableCell className="text-right font-heading">₹{calculateTotal().toFixed(2)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Section 5: Payments */}
        {isFoodItemsUnlocked && calculateTotal() > 0 && (
          <div className="w-full">
            <div className="bg-white/80 rounded-md border-2 border-black p-6 shadow-shadow w-full">
            <div className="space-y-4">
              <h2 className="text-xl font-heading text-center">Who Paid How Much?</h2>
              <div className="space-y-3">
                {payments.map((payment, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`paid-${index}`}
                        checked={payment.paid}
                        onCheckedChange={() => togglePayment(index)}
                      />
                      <label htmlFor={`paid-${index}`} className="font-base cursor-pointer">
                        {payment.person}
                      </label>
                    </div>
                    {payment.paid && (
                      <div className="ml-6">
                        <label className="block text-sm mb-1 font-base">Amount Paid</label>
                        <input
                          type="number"
                          value={payment.amount}
                          onChange={(e) => updatePayment(index, e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border-2 border-black rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Payment Summary */}
              {payments.some(p => p.paid) && (
                <div className="pt-4 border-t-2 border-black">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-base">Total Paid:</span>
                    <span className="font-bold">₹{totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-base">Total Bill:</span>
                    <span className="font-bold">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  
                  {/* Warning or Success Message */}
                  {!paymentsMatch && totalPaid > 0 && (
                    <div className="flex items-start gap-2 p-3 mt-3 bg-yellow-100/50 border-2 border-yellow-600 rounded-md">
                      <svg className="w-5 h-5 text-yellow-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-sm font-base text-yellow-900">
                        Warning: Total paid (₹{totalPaid.toFixed(2)}) does not match total bill (₹{calculateTotal().toFixed(2)}). 
                        {totalPaid < calculateTotal() 
                          ? ` Short by ₹${(calculateTotal() - totalPaid).toFixed(2)}.`
                          : ` Overpaid by ₹${(totalPaid - calculateTotal()).toFixed(2)}.`
                        }
                      </p>
                    </div>
                  )}
                  
                  {/* Calculate Button */}
                  <Button 
                    className="w-full mt-4"
                    onClick={handleCalculate}
                    disabled={!paymentsMatch || totalPaid === 0}
                  >
                    Calculate Split
                  </Button>
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Back Button */}
        <div className="w-[90%]">
          <Link href="/">
            <Button variant="neutral" className="w-full">
              ← Back to Upload
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
