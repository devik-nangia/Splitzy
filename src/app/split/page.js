'use client'

import { Button } from '@/components/ui/button'
import Star8 from '@/components/stars/s8'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function SplitPage() {
  const [data, setData] = useState(null)
  const [personShares, setPersonShares] = useState({})
  const [transactions, setTransactions] = useState([])
  const [personBreakdowns, setPersonBreakdowns] = useState({})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Load data from localStorage
    const storedData = localStorage.getItem('splitzy_data')
    if (storedData) {
      const parsedData = JSON.parse(storedData)
      setData(parsedData)
      calculateSplit(parsedData)
    }
  }, [])

  const calculateSplit = (billData) => {
    const { peopleNames, foodItems, taxAmount, payments, subtotal, total } = billData
    
    // Validate data
    if (!peopleNames || !Array.isArray(peopleNames) || peopleNames.length === 0) {
      console.error('Invalid peopleNames data')
      return
    }
    
    if (!foodItems || !Array.isArray(foodItems)) {
      console.error('Invalid foodItems data')
      return
    }
    
    // Initialize person shares
    const shares = {}
    const breakdowns = {}
    peopleNames.forEach(name => {
      if (name && name.trim() !== '') {
        shares[name] = { subtotalShare: 0, taxShare: 0, totalOwed: 0, paid: 0, balance: 0 }
        breakdowns[name] = { items: [], tax: 0 }
      }
    })

    // Calculate each person's share of food items
    foodItems.forEach(item => {
      if (!item) return
      
      const quantity = parseFloat(item.quantity) || 1
      const price = parseFloat(item.price) || 0
      const itemTotal = quantity * price
      
      // Ensure item.people is an array
      const itemPeople = Array.isArray(item.people) ? item.people : []
      
      // Filter to only include people that exist in our shares
      const validPeople = itemPeople.filter(personName => 
        personName && shares[personName] !== undefined
      )
      const peopleCount = validPeople.length

      if (peopleCount > 0) {
        const sharePerPerson = itemTotal / peopleCount
        validPeople.forEach(personName => {
          if (shares[personName] && breakdowns[personName]) {
            shares[personName].subtotalShare += sharePerPerson
            breakdowns[personName].items.push({
              name: item.name || 'Unnamed Item',
              quantity: quantity,
              price: price,
              share: sharePerPerson
            })
          }
        })
      }
    })

    // Calculate tax share (split equally among all people)
    const tax = parseFloat(taxAmount) || 0
    if (tax > 0 && peopleNames.length > 0) {
      const taxPerPerson = tax / peopleNames.length
      peopleNames.forEach(name => {
        if (shares[name] && breakdowns[name]) {
          shares[name].taxShare = isNaN(taxPerPerson) ? 0 : taxPerPerson
          breakdowns[name].tax = shares[name].taxShare
        }
      })
    }

    // Calculate total owed and what was paid
    peopleNames.forEach(name => {
      if (shares[name]) {
        const subtotalShare = shares[name].subtotalShare || 0
        const taxShare = shares[name].taxShare || 0
        shares[name].totalOwed = (isNaN(subtotalShare) ? 0 : subtotalShare) + (isNaN(taxShare) ? 0 : taxShare)
        
        const payment = Array.isArray(payments) ? payments.find(p => p && p.person === name) : null
        const paidAmount = payment ? (parseFloat(payment.amount) || 0) : 0
        shares[name].paid = isNaN(paidAmount) ? 0 : paidAmount
        shares[name].balance = shares[name].totalOwed - shares[name].paid
        
        // Ensure no NaN values
        if (isNaN(shares[name].totalOwed)) shares[name].totalOwed = 0
        if (isNaN(shares[name].paid)) shares[name].paid = 0
        if (isNaN(shares[name].balance)) shares[name].balance = 0
      }
    })

    setPersonShares(shares)
    setPersonBreakdowns(breakdowns)

    // Calculate optimized transactions (who owes whom)
    const calculatedTransactions = calculateTransactions(shares)
    setTransactions(calculatedTransactions)
  }

  const calculateTransactions = (shares) => {
    // Get people who owe money (positive balance) and people who are owed (negative balance)
    const debtors = []
    const creditors = []

    Object.keys(shares).forEach(name => {
      const balance = shares[name].balance
      if (Math.abs(balance) > 0.01) { // Only consider if balance is significant
        if (balance > 0) {
          debtors.push({ name, amount: balance })
        } else {
          creditors.push({ name, amount: -balance }) // Make positive for easier calculation
        }
      }
    })

    // Minimize transactions by matching debts
    const transactions = []
    let debtorIndex = 0
    let creditorIndex = 0

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex]
      const creditor = creditors[creditorIndex]
      
      const amount = Math.min(debtor.amount, creditor.amount)
      
      if (amount > 0.01) { // Only add if amount is significant
        transactions.push({
          from: debtor.name,
          to: creditor.name,
          amount: amount
        })
      }

      debtor.amount -= amount
      creditor.amount -= amount

      if (debtor.amount < 0.01) debtorIndex++
      if (creditor.amount < 0.01) creditorIndex++
    }

    return transactions
  }

  const copySettlements = async () => {
    if (transactions.length === 0) return

    const settlementsText = transactions
      .map((transaction, index) => {
        return `${index + 1}. ${transaction.from} owes ₹${transaction.amount.toFixed(2)} to ${transaction.to}`
      })
      .join('\n')

    try {
      await navigator.clipboard.writeText(settlementsText)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!data) {
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
          <div className="bg-white/80 rounded-md border-2 border-black p-6 shadow-shadow w-full">
            <p className="text-center">No data found. Please go back and calculate the split.</p>
          </div>
          <div className="w-[90%]">
            <Link href="/items">
              <Button variant="neutral" className="w-full">
                ← Back to Items
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

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
        
        {/* Transactions (Who owes whom) */}
        {transactions.length > 0 && (
          <div className="bg-white/80 rounded-md border-2 border-black p-6 shadow-shadow w-full">
            <div className="flex items-center justify-center gap-2 mb-4">
              <h2 className="text-xl font-heading">Settlement Instructions</h2>
              <button
                onClick={copySettlements}
                className="cursor-pointer hover:opacity-70 transition-opacity"
                aria-label="Copy settlements"
              >
                {copied ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="space-y-3">
              {transactions.map((transaction, index) => (
                <div key={index} className="p-4 border-2 border-black rounded-base bg-white/50">
                  <p className="font-base text-center">
                    <span className="font-bold">{transaction.from}</span> owes{' '}
                    <span className="font-bold text-red-600">₹{transaction.amount.toFixed(2)}</span> to{' '}
                    <span className="font-bold">{transaction.to}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Breakdowns */}
        <div className="bg-white/80 rounded-md border-2 border-black p-6 shadow-shadow w-full">
          <h2 className="text-xl font-heading text-center mb-4">Individual Breakdown</h2>
          <div className="space-y-4">
            {data.peopleNames.map((name) => {
              const breakdown = personBreakdowns[name]
              const share = personShares[name]
              if (!breakdown || !share) return null
              
              return (
                <div key={name} className="p-4 border-2 border-black rounded-base space-y-2">
                  <h3 className="font-heading text-lg">{name}</h3>
                  {breakdown.items.length > 0 && (
                    <div className="space-y-1">
                      {breakdown.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-base">{item.name} (₹{item.share.toFixed(2)})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {share.taxShare > 0 && (
                    <div className="flex justify-between text-sm pt-1 border-t border-black">
                      <span className="font-base">Tax Share:</span>
                      <span className="font-base">₹{share.taxShare.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t-2 border-black">
                    <span>Total Owed:</span>
                    <span>₹{share.totalOwed.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-base">Paid:</span>
                    <span className="font-base">₹{share.paid.toFixed(2)}</span>
                  </div>
                  <div className={`flex justify-between font-bold pt-1 ${
                    share.balance > 0.01 ? 'text-red-600' : 
                    share.balance < -0.01 ? 'text-green-600' : 
                    'text-black'
                  }`}>
                    <span>Balance:</span>
                    <span>
                      {share.balance > 0.01 ? `-₹${share.balance.toFixed(2)}` : 
                       share.balance < -0.01 ? `+₹${(-share.balance).toFixed(2)}` : 
                       '₹0.00'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="w-[90%]">
          <Link href="/items">
            <Button variant="neutral" className="w-full">
              ← Back to Items
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

