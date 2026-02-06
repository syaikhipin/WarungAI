'use client'

import { useState, useRef, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, QrCode, Loader2, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createTransaction, type OrderItem } from '@/lib/actions/transactions'
import { saveVoiceRecording } from '@/lib/actions/voiceRecordings'

interface CurrentShift {
  id: number
  openedAt: string
  openingCash: number
}

interface Props {
  currentShift: CurrentShift | null
}

interface PendingPriceItem {
  name: string
  quantity: number
  suggestedPrice: number | null
  confidence: string
}

interface PendingQuantityItem {
  name: string
  suggestedQuantity: number
  originalPhrase: string
  reason: string
  price?: number
}

type PaymentMethod = 'Cash' | 'Card' | 'E-Wallet' | 'QR Pay'

// Format currency in USD
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function OrderingClient({ currentShift }: Props) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null)
  const [cashReceived, setCashReceived] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Items that need price confirmation
  const [pendingPriceItems, setPendingPriceItems] = useState<PendingPriceItem[]>([])
  const [showPriceDialog, setShowPriceDialog] = useState(false)
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({})

  // Items that need quantity confirmation
  const [pendingQuantityItems, setPendingQuantityItems] = useState<PendingQuantityItem[]>([])
  const [showQuantityDialog, setShowQuantityDialog] = useState(false)
  const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({})

  // Store transcriptions temporarily during ordering session
  const [recentTranscriptions, setRecentTranscriptions] = useState<Array<{
    text: string
    parsedItems: any[]
    timestamp: number
    processingTimeMs: number
  }>>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const processingRef = useRef(false)
  const recordingStartTimeRef = useRef<number>(0)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0)
  const tax = 0
  const total = subtotal + tax

  const changeAmount = selectedPayment === 'Cash' && cashReceived
    ? parseFloat(cashReceived) - total
    : 0

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

      audioChunksRef.current = []
      recordingStartTimeRef.current = Date.now()
      setRecordingDuration(0)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

        // Check minimum recording duration and file size
        const duration = Date.now() - recordingStartTimeRef.current
        if (duration < 500 || audioBlob.size < 1000) {
          alert('Recording too short. Please hold the button longer while speaking.')
          setIsRecording(false)
          setRecordingDuration(0)
          return
        }

        console.log(`✅ [CLIENT] Audio recorded: ${audioBlob.size} bytes, ${duration}ms duration`)
        await processAudio(audioBlob)
      }

      mediaRecorderRef.current = mediaRecorder
      // Start with timeslice to ensure data is captured periodically
      mediaRecorder.start(100) // Capture data every 100ms
      setIsRecording(true)

      // Update duration display every 100ms
      const intervalId = setInterval(() => {
        if (recordingStartTimeRef.current > 0) {
          setRecordingDuration(Date.now() - recordingStartTimeRef.current)
        } else {
          clearInterval(intervalId)
        }
      }, 100)

      // Store interval ID for cleanup
      ;(mediaRecorder as any).intervalId = intervalId
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Cannot access microphone. Please grant microphone permission.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Clear the duration update interval
      const intervalId = (mediaRecorderRef.current as any).intervalId
      if (intervalId) {
        clearInterval(intervalId)
      }

      mediaRecorderRef.current.stop()
      setIsRecording(false)
      recordingStartTimeRef.current = 0
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    if (processingRef.current) {
      console.log('⚠️ [CLIENT] Already processing, skipping duplicate call')
      return
    }

    processingRef.current = true
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log('🔵 [CLIENT] Starting processAudio with requestId:', requestId)

    setIsProcessing(true)
    const startTime = Date.now()

    try {
      // Step 1: Transcribe
      setProcessingStep('Converting voice to text...')
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json().catch(() => ({
          error: `Transcription failed: ${transcribeResponse.status}`,
        }))
        throw new Error(errorData.error || 'Transcription failed')
      }

      const { text: transcription } = await transcribeResponse.json()

      if (!transcription || transcription.trim().length === 0) {
        processingRef.current = false
        alert('Audio not clear. Please try again.')
        setIsProcessing(false)
        return
      }

      console.log('📝 [CLIENT] Transcription:', transcription)

      // Step 2: Parse order with Gemini (NO MENU REQUIRED)
      setProcessingStep('Extracting order details...')
      const parseResponse = await fetch('/api/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcription,
          currentOrderItems: orderItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      })

      if (!parseResponse.ok) {
        processingRef.current = false
        throw new Error('Order parsing failed')
      }

      const response = await parseResponse.json()
      console.log('🔵 [CLIENT] Gemini response:', response)

      const { items: parsedItems, actions, needsPriceSuggestion, needsQuantityConfirmation } = response

      // Check for items that need quantity confirmation
      if (needsQuantityConfirmation && needsQuantityConfirmation.length > 0) {
        console.log('📊 [CLIENT] Items need quantity confirmation:', needsQuantityConfirmation)

        const itemsNeedingQuantity: PendingQuantityItem[] = needsQuantityConfirmation.map((item: any) => ({
          name: item.name,
          suggestedQuantity: item.suggestedQuantity || 1,
          originalPhrase: item.originalPhrase || 'not specified',
          reason: item.reason || 'Quantity needs confirmation',
          price: null, // Will be filled later if needed
        }))

        if (itemsNeedingQuantity.length > 0) {
          setPendingQuantityItems(itemsNeedingQuantity)
          setEditingQuantities(
            itemsNeedingQuantity.reduce((acc, item) => ({
              ...acc,
              [item.name]: item.suggestedQuantity.toString(),
            }), {})
          )
          setShowQuantityDialog(true)
          // Don't process items yet - wait for quantity confirmation
          processingRef.current = false
          setIsProcessing(false)
          return
        }
      }

      // Check for items that need price suggestions
      if (needsPriceSuggestion && needsPriceSuggestion.length > 0) {
        console.log('💰 [CLIENT] Items need price suggestion:', needsPriceSuggestion)

        // Collect items that need prices
        const itemsNeedingPrice: PendingPriceItem[] = []
        const allItems = [...(parsedItems || []), ...(actions?.add || [])]

        allItems.forEach((item: any) => {
          if (!item.price || item.price === null || item.price === 0) {
            itemsNeedingPrice.push({
              name: item.name,
              quantity: item.quantity,
              suggestedPrice: null, // TODO: Get from price history
              confidence: 'low',
            })
          }
        })

        if (itemsNeedingPrice.length > 0) {
          setPendingPriceItems(itemsNeedingPrice)
          setEditingPrices(
            itemsNeedingPrice.reduce((acc, item) => ({
              ...acc,
              [item.name]: item.suggestedPrice?.toString() || '',
            }), {})
          )
          setShowPriceDialog(true)
        }
      }

      // Process items with prices
      setOrderItems(prev => {
        let merged = [...prev]
        let actionsProcessed = false

        if (actions) {
          // Handle removals
          if (actions.remove && actions.remove.length > 0) {
            merged = merged.filter(item =>
              !actions.remove.some((rem: { name?: string }) =>
                rem.name?.toLowerCase() === item.name.toLowerCase()
              )
            )
            actionsProcessed = true
          }

          // Handle updates
          if (actions.update && actions.update.length > 0) {
            actions.update.forEach((updateItem: { name: string; quantity: number; price: number }) => {
              const existingIndex = merged.findIndex(i =>
                i.name.toLowerCase() === updateItem.name.toLowerCase()
              )

              if (existingIndex >= 0) {
                merged[existingIndex] = {
                  ...merged[existingIndex],
                  quantity: updateItem.quantity,
                  price: updateItem.price || merged[existingIndex].price,
                }
              } else if (updateItem.price) {
                merged.push({
                  item_id: 0,
                  name: updateItem.name,
                  quantity: updateItem.quantity,
                  price: updateItem.price,
                })
              }
            })
            actionsProcessed = true
          }

          // Handle additions
          if (actions.add && actions.add.length > 0) {
            actions.add.forEach((addItem: { name: string; quantity: number; price: number }) => {
              // Only add items that have prices
              if (!addItem.price) return

              const existingIndex = merged.findIndex(i =>
                i.name.toLowerCase() === addItem.name.toLowerCase()
              )

              if (existingIndex >= 0) {
                merged[existingIndex] = {
                  ...merged[existingIndex],
                  quantity: merged[existingIndex].quantity + addItem.quantity
                }
              } else {
                merged.push({
                  item_id: 0,
                  name: addItem.name,
                  quantity: addItem.quantity,
                  price: addItem.price,
                })
              }
            })
            actionsProcessed = true
          }
        }

        // Fall back to items
        if (!actionsProcessed && parsedItems && parsedItems.length > 0) {
          parsedItems.forEach((item: { name: string; quantity: number; price: number }) => {
            // Only add items that have prices
            if (!item.price) return

            const existingIndex = merged.findIndex(i =>
              i.name.toLowerCase() === item.name.toLowerCase()
            )

            if (existingIndex >= 0) {
              merged[existingIndex] = {
                ...merged[existingIndex],
                quantity: merged[existingIndex].quantity + item.quantity
              }
            } else {
              merged.push({
                item_id: 0,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              })
            }
          })
        }

        return merged
      })

      // Store transcription
      const itemsToStore = actions?.add || actions?.update || parsedItems || []
      const processingTime = Date.now() - startTime
      setRecentTranscriptions(prev => [...prev, {
        text: transcription,
        parsedItems: itemsToStore,
        timestamp: Date.now(),
        processingTimeMs: processingTime,
      }])

    } catch (error) {
      console.error('Error processing audio:', error)
      alert('Error processing audio. Please try again.')
    } finally {
      processingRef.current = false
      setIsProcessing(false)
      setProcessingStep('')
    }
  }

  // Confirm prices for pending items
  const confirmPendingPrices = () => {
    const newItems: OrderItem[] = []

    pendingPriceItems.forEach(item => {
      const priceStr = editingPrices[item.name]
      const price = parseFloat(priceStr)

      if (price && price > 0) {
        newItems.push({
          item_id: 0,
          name: item.name,
          quantity: item.quantity,
          price: price,
        })
      }
    })

    if (newItems.length > 0) {
      setOrderItems(prev => {
        const merged = [...prev]
        newItems.forEach(newItem => {
          const existingIndex = merged.findIndex(i =>
            i.name.toLowerCase() === newItem.name.toLowerCase()
          )
          if (existingIndex >= 0) {
            merged[existingIndex].quantity += newItem.quantity
          } else {
            merged.push(newItem)
          }
        })
        return merged
      })
    }

    setPendingPriceItems([])
    setShowPriceDialog(false)
    setEditingPrices({})
  }

  // Confirm quantities for pending items
  const confirmPendingQuantities = () => {
    const confirmedItems: Array<{name: string, quantity: number}> = []

    pendingQuantityItems.forEach(item => {
      const quantityStr = editingQuantities[item.name]
      const quantity = parseInt(quantityStr)

      if (quantity && quantity > 0) {
        confirmedItems.push({
          name: item.name,
          quantity: quantity,
        })
      }
    })

    // Now check if these items need prices
    const itemsNeedingPrice: PendingPriceItem[] = confirmedItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      suggestedPrice: null,
      confidence: 'low',
    }))

    if (itemsNeedingPrice.length > 0) {
      setPendingPriceItems(itemsNeedingPrice)
      setEditingPrices(
        itemsNeedingPrice.reduce((acc, item) => ({
          ...acc,
          [item.name]: '',
        }), {})
      )
      setShowQuantityDialog(false)
      setPendingQuantityItems([])
      setEditingQuantities({})
      setShowPriceDialog(true)
    } else {
      setPendingQuantityItems([])
      setShowQuantityDialog(false)
      setEditingQuantities({})
    }
  }

  // Manual item functions
  const addManualItem = () => {
    const name = prompt('Enter item name:')
    if (!name) return

    const priceStr = prompt('Enter price (USD):')
    if (!priceStr) return

    const price = parseFloat(priceStr)
    if (isNaN(price) || price <= 0) {
      alert('Invalid price')
      return
    }

    setOrderItems(prev => {
      const existingIndex = prev.findIndex(i =>
        i.name.toLowerCase() === name.toLowerCase()
      )
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex].quantity += 1
        return updated
      }
      return [...prev, { item_id: 0, name, quantity: 1, price }]
    })
  }

  const updateQuantity = (index: number, delta: number) => {
    setOrderItems(prev => {
      const updated = [...prev]
      updated[index].quantity = Math.max(1, updated[index].quantity + delta)
      return updated
    })
  }

  const removeItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index))
  }

  const handlePayment = () => {
    if (orderItems.length === 0) return
    setShowPayment(true)
  }

  const confirmPayment = () => {
    if (!selectedPayment) return
    if (selectedPayment === 'Cash' && parseFloat(cashReceived) < total) {
      alert('Insufficient cash received')
      return
    }

    startTransition(async () => {
      try {
        // Create transaction
        await createTransaction({
          items: orderItems,
          subtotal,
          tax,
          total,
          paymentMethod: selectedPayment,
          paymentReceived: selectedPayment === 'Cash' ? parseFloat(cashReceived) : undefined,
          changeGiven: selectedPayment === 'Cash' ? changeAmount : undefined,
        })

        // Save voice recordings
        if (recentTranscriptions.length > 0) {
          const savePromises = recentTranscriptions.map(transcription =>
            saveVoiceRecording({
              transcription: transcription.text,
              parsedOrder: { items: transcription.parsedItems },
              confidenceScore: 0.9,
              processingTimeMs: transcription.processingTimeMs,
            }).catch(error => {
              console.error('Failed to save voice recording:', error)
            })
          )
          await Promise.all(savePromises)
          setRecentTranscriptions([])
        }

        alert('Transaction successful!')

        // Reset state
        setOrderItems([])
        setShowPayment(false)
        setSelectedPayment(null)
        setCashReceived('')
      } catch (error) {
        console.error('Transaction error:', error)
        alert('Transaction failed. Please try again.')
      }
    })
  }

  const paymentMethods: { method: PaymentMethod; icon: any; label: string }[] = [
    { method: 'Cash', icon: Banknote, label: 'Cash' },
    { method: 'Card', icon: CreditCard, label: 'Card' },
    { method: 'E-Wallet', icon: Smartphone, label: 'E-Wallet' },
    { method: 'QR Pay', icon: QrCode, label: 'QR Pay' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice Order</h1>
          <p className="text-muted-foreground">
            Speak naturally to record transactions
          </p>
        </div>
        {currentShift ? (
          <Badge variant="default" className="bg-green-500">
            Shift Active
          </Badge>
        ) : (
          <Badge variant="destructive">
            No Active Shift
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Input & Order List */}
        <div className="space-y-4">
          {/* Voice Recording Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <motion.button
                  className={`w-32 h-32 rounded-full flex items-center justify-center transition-colors ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600'
                      : isProcessing
                      ? 'bg-yellow-500'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  onMouseDown={!isProcessing ? startRecording : undefined}
                  onMouseUp={!isProcessing ? stopRecording : undefined}
                  onTouchStart={!isProcessing ? startRecording : undefined}
                  onTouchEnd={!isProcessing ? stopRecording : undefined}
                  whileTap={{ scale: 0.95 }}
                  disabled={isProcessing || !currentShift}
                >
                  {isProcessing ? (
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  ) : (
                    <Mic className="w-12 h-12 text-white" />
                  )}
                </motion.button>

                <p className="text-sm text-muted-foreground text-center">
                  {!currentShift
                    ? 'Please open a shift first'
                    : isRecording
                    ? `Recording... ${(recordingDuration / 1000).toFixed(1)}s`
                    : isProcessing
                    ? processingStep
                    : 'Press and hold to speak (min 0.5s)'}
                </p>

                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Example: &quot;two fried rice $15, one sweet tea $5&quot;
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Current Order</CardTitle>
              <Button variant="outline" size="sm" onClick={addManualItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {orderItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No items yet. Speak or add manually.
                </p>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {orderItems.map((item, index) => (
                      <motion.div
                        key={`${item.name}-${index}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(index, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(index, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Section */}
        <div className="space-y-4">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {!showPayment ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePayment}
                  disabled={orderItems.length === 0 || !currentShift}
                >
                  Proceed to Payment
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map(({ method, icon: Icon, label }) => (
                      <Button
                        key={method}
                        variant={selectedPayment === method ? 'default' : 'outline'}
                        className="h-16 flex-col gap-1"
                        onClick={() => setSelectedPayment(method)}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{label}</span>
                      </Button>
                    ))}
                  </div>

                  {selectedPayment === 'Cash' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cash Received</label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                      />
                      {changeAmount > 0 && (
                        <p className="text-sm">
                          Change: <span className="font-bold">{formatCurrency(changeAmount)}</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowPayment(false)
                        setSelectedPayment(null)
                        setCashReceived('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={confirmPayment}
                      disabled={!selectedPayment || isPending}
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Confirm Payment'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quantity Confirmation Dialog */}
      {showQuantityDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                Quantity Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please confirm quantities for the following items:
              </p>

              {pendingQuantityItems.map((item) => (
                <div key={item.name} className="space-y-2 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {item.name}
                    </label>
                    <Badge variant="outline" className="text-xs">
                      Said: &quot;{item.originalPhrase}&quot;
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Quantity:</span>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      value={editingQuantities[item.name] || ''}
                      onChange={(e) => setEditingQuantities(prev => ({
                        ...prev,
                        [item.name]: e.target.value,
                      }))}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">
                      (suggested: {item.suggestedQuantity})
                    </span>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setPendingQuantityItems([])
                    setShowQuantityDialog(false)
                    setEditingQuantities({})
                  }}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmPendingQuantities}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Confirm Quantities
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Price Confirmation Dialog */}
      {showPriceDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                Price Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please enter prices for the following items:
              </p>

              {pendingPriceItems.map((item) => (
                <div key={item.name} className="space-y-2">
                  <label className="text-sm font-medium">
                    {item.quantity}x {item.name}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="Enter price"
                      value={editingPrices[item.name] || ''}
                      onChange={(e) => setEditingPrices(prev => ({
                        ...prev,
                        [item.name]: e.target.value,
                      }))}
                    />
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setPendingPriceItems([])
                    setShowPriceDialog(false)
                    setEditingPrices({})
                  }}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmPendingPrices}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Confirm Prices
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
