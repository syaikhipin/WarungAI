'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Send, Play, Pause, Volume2, VolumeX,
  User, Bot, Clock, DollarSign, ShoppingCart,
  Plus, Minus, X, RefreshCw, Download,
  MessageSquare, Loader2, Banknote, CheckCircle2,
  Terminal, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface CurrentShift {
  id: number
  openedAt: string
  openingCash: number
}

interface MenuItem {
  id: number
  name: string
  price: number
  category: string
}

interface Props {
  currentShift: CurrentShift | null
  menuItems: MenuItem[]
}

// Message types for conversation
type MessageRole = 'customer' | 'seller' | 'negotiation'
type MessageType = 'text' | 'order' | 'price_suggestion' | 'quantity_confirm' | 'payment' | 'complete'

interface OrderItem {
  name: string
  quantity: number
  price: number | null
  confirmed: boolean
}

interface ConversationMessage {
  id: string
  role: MessageRole
  type: MessageType
  content: string
  timestamp: Date
  audioUrl?: string // For TTS playback
  ttsText?: string // Text to be converted to TTS
  orderItems?: OrderItem[]
  suggestedPrice?: number
  originalPrice?: number
  isPlaying?: boolean
}

// TTS Export format for external generation
interface TTSExportItem {
  id: string
  role: MessageRole
  text: string
  timestamp: string
  language: string
  voice: string // 'customer' or 'system'
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export default function ConversationClient({ currentShift, menuItems }: Props) {
  // Conversation state
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)

  // Order state
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([])
  const [pendingNegotiation, setPendingNegotiation] = useState<{
    itemName: string
    originalPrice: number
    suggestedPrice: number
  } | null>(null)

  // TTS state
  const [isMuted, setIsMuted] = useState(false)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)

  // Simulation state
  const [isSimulationPlaying, setIsSimulationPlaying] = useState(false)
  const [currentSimulationIndex, setCurrentSimulationIndex] = useState(0)
  const [selectedScenario, setSelectedScenario] = useState<string>('simple_order')
  const [audioVolume, setAudioVolume] = useState(0)
  const [availableScenarios, setAvailableScenarios] = useState<string[]>([])

  // Payment state (Cash only)
  const [cashReceived, setCashReceived] = useState<string>('')
  const [isPaymentComplete, setIsPaymentComplete] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [showCompletionNotification, setShowCompletionNotification] = useState(false)
  const [completionCountdown, setCompletionCountdown] = useState(5)

  // Debug/Log state
  const [showDebugPanel, setShowDebugPanel] = useState(true)
  const [apiLogs, setApiLogs] = useState<Array<{
    timestamp: Date
    type: 'sensevoice' | 'gemini' | 'error' | 'simulation'
    title: string
    data: any
  }>>([])

  // Add log entry helper
  const addApiLog = (type: 'sensevoice' | 'gemini' | 'error' | 'simulation', title: string, data: any) => {
    setApiLogs(prev => [...prev.slice(-19), { timestamp: new Date(), type, title, data }])
  }

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const simulationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      addSystemMessage(
        'Welcome! I\'m ready to take your order. What would you like today?',
        'text'
      )
    }
  }, [])

  // Load available scenarios
  useEffect(() => {
    fetch('/tts/conversations.json')
      .then(res => res.json())
      .then(data => {
        setAvailableScenarios(Object.keys(data))
      })
      .catch(err => console.error('Failed to load scenarios:', err))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Auto-closing notification when payment is complete
  useEffect(() => {
    if (isPaymentComplete && !showCompletionNotification) {
      setShowCompletionNotification(true)
      setCompletionCountdown(5)
    }
  }, [isPaymentComplete, showCompletionNotification])

  // Countdown timer for auto-close
  useEffect(() => {
    if (showCompletionNotification && completionCountdown > 0) {
      const timer = setTimeout(() => {
        setCompletionCountdown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (showCompletionNotification && completionCountdown === 0) {
      // Auto-close and reset
      setShowCompletionNotification(false)
      resetConversation()
    }
  }, [showCompletionNotification, completionCountdown])

  const addSystemMessage = (content: string, type: MessageType, extras?: Partial<ConversationMessage>) => {
    const message: ConversationMessage = {
      id: generateId(),
      role: 'seller',
      type,
      content,
      timestamp: new Date(),
      ttsText: content,
      ...extras,
    }
    setMessages(prev => [...prev, message])
    return message
  }

  const addCustomerMessage = (content: string, type: MessageType = 'text') => {
    const message: ConversationMessage = {
      id: generateId(),
      role: 'customer',
      type,
      content,
      timestamp: new Date(),
      ttsText: content,
    }
    setMessages(prev => [...prev, message])
    return message
  }

  // Voice recording
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
        const duration = Date.now() - recordingStartTimeRef.current

        if (duration < 500 || audioBlob.size < 1000) {
          alert('Recording too short. Please hold longer while speaking.')
          setIsRecording(false)
          return
        }

        await processVoiceInput(audioBlob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)
      setIsRecording(true)

      const intervalId = setInterval(() => {
        if (recordingStartTimeRef.current > 0) {
          setRecordingDuration(Date.now() - recordingStartTimeRef.current)
        } else {
          clearInterval(intervalId)
        }
      }, 100)

      ;(mediaRecorder as any).intervalId = intervalId
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Cannot access microphone.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      const intervalId = (mediaRecorderRef.current as any).intervalId
      if (intervalId) clearInterval(intervalId)
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      recordingStartTimeRef.current = 0
    }
  }

  // Process voice input
  const processVoiceInput = async (audioBlob: Blob) => {
    setIsProcessing(true)

    try {
      // Transcribe
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')

      addApiLog('sensevoice', 'Sending audio to SenseVoice', { size: audioBlob.size, type: audioBlob.type })

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      const transcribeData = await transcribeResponse.json()

      if (!transcribeResponse.ok) {
        addApiLog('error', 'SenseVoice Transcription Failed', transcribeData)
        throw new Error('Transcription failed')
      }

      addApiLog('sensevoice', 'SenseVoice Transcription Result', transcribeData)

      const transcription = transcribeData.text
      if (!transcription?.trim()) {
        addSystemMessage('I didn\'t catch that. Could you please repeat?', 'text')
        return
      }

      // Add customer message
      addCustomerMessage(transcription)

      // Process the order
      await processOrderText(transcription)
    } catch (error) {
      console.error('Error processing voice:', error)
      addApiLog('error', 'Voice Processing Error', { message: (error as Error).message })
      addSystemMessage('Sorry, there was an error processing your voice. Please try again.', 'text')
    } finally {
      setIsProcessing(false)
    }
  }

  // Process text input (from voice or typed)
  const processOrderText = async (text: string) => {
    setIsProcessing(true)

    try {
      addApiLog('gemini', 'Sending to Gemini for parsing', { transcript: text, currentOrder: currentOrder.map(i => `${i.quantity}x ${i.name}`) })

      const parseResponse = await fetch('/api/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          currentOrderItems: currentOrder.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      })

      const response = await parseResponse.json()

      if (!parseResponse.ok) {
        addApiLog('error', 'Gemini Parse Failed', response)
        throw new Error('Parse failed')
      }

      addApiLog('gemini', 'Gemini Parse Result', response)
      console.log('Parse response:', response)

      // Handle parsed items
      await handleParsedOrder(response)
    } catch (error) {
      console.error('Error parsing order:', error)
      addApiLog('error', 'Order Parsing Error', { message: (error as Error).message })
      addSystemMessage(
        'I had trouble understanding that. Could you please rephrase your order?',
        'text'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle parsed order response
  const handleParsedOrder = async (response: any) => {
    const { items, actions, needsPriceSuggestion, needsQuantityConfirmation, ambiguous } = response

    // Handle ambiguous orders
    if (ambiguous && response.ambiguousQuery) {
      addSystemMessage(response.ambiguousQuery, 'text')
      return
    }

    // Handle quantity confirmation needed
    if (needsQuantityConfirmation?.length > 0) {
      const item = needsQuantityConfirmation[0]
      addSystemMessage(
        `For "${item.name}", you said "${item.originalPhrase}". How many would you like? I suggest ${item.suggestedQuantity}.`,
        'quantity_confirm'
      )
      return
    }

    // Process items
    const allItems = [...(items || []), ...(actions?.add || [])]
    const itemsNeedingPrice: OrderItem[] = []
    const itemsWithPrice: OrderItem[] = []

    allItems.forEach((item: any) => {
      if (!item.price || item.price === 0) {
        // Check menu for price
        const menuItem = menuItems.find(m =>
          m.name.toLowerCase() === item.name.toLowerCase()
        )
        if (menuItem) {
          itemsWithPrice.push({
            name: item.name,
            quantity: item.quantity,
            price: menuItem.price,
            confirmed: true,
          })
        } else {
          itemsNeedingPrice.push({
            name: item.name,
            quantity: item.quantity,
            price: null,
            confirmed: false,
          })
        }
      } else {
        itemsWithPrice.push({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          confirmed: true,
        })
      }
    })

    // Add items with prices to order
    if (itemsWithPrice.length > 0) {
      setCurrentOrder(prev => {
        const updated = [...prev]
        itemsWithPrice.forEach(newItem => {
          const existingIdx = updated.findIndex(i =>
            i.name.toLowerCase() === newItem.name.toLowerCase()
          )
          if (existingIdx >= 0) {
            updated[existingIdx].quantity += newItem.quantity
          } else {
            updated.push(newItem)
          }
        })
        return updated
      })

      const itemsList = itemsWithPrice.map(i =>
        `${i.quantity}x ${i.name} at ${formatCurrency(i.price!)}`
      ).join(', ')

      addSystemMessage(
        `Got it! I've added ${itemsList} to your order. Anything else?`,
        'order',
        { orderItems: itemsWithPrice }
      )
    }

    // Handle items needing price
    if (itemsNeedingPrice.length > 0) {
      const item = itemsNeedingPrice[0]
      setPendingNegotiation({
        itemName: item.name,
        originalPrice: 0,
        suggestedPrice: 0,
      })

      addSystemMessage(
        `I don't have a price for "${item.name}". How much should it be?`,
        'price_suggestion'
      )
    }

    // Handle removals
    if (actions?.remove?.length > 0) {
      setCurrentOrder(prev =>
        prev.filter(item =>
          !actions.remove.some((r: any) =>
            r.name.toLowerCase() === item.name.toLowerCase()
          )
        )
      )
      const removedNames = actions.remove.map((r: any) => r.name).join(', ')
      addSystemMessage(`Removed ${removedNames} from your order.`, 'text')
    }

    // Handle updates
    if (actions?.update?.length > 0) {
      setCurrentOrder(prev => {
        const updated = [...prev]
        actions.update.forEach((u: any) => {
          const idx = updated.findIndex(i =>
            i.name.toLowerCase() === u.name.toLowerCase()
          )
          if (idx >= 0) {
            updated[idx].quantity = u.quantity
          }
        })
        return updated
      })
      const updatesList = actions.update.map((u: any) =>
        `${u.name} to ${u.quantity}`
      ).join(', ')
      addSystemMessage(`Updated ${updatesList}.`, 'text')
    }
  }

  // Handle price negotiation
  const handlePriceInput = (price: number) => {
    if (!pendingNegotiation) return

    const newItem: OrderItem = {
      name: pendingNegotiation.itemName,
      quantity: 1,
      price,
      confirmed: true,
    }

    setCurrentOrder(prev => [...prev, newItem])
    setPendingNegotiation(null)

    addSystemMessage(
      `Perfect! Added ${newItem.name} at ${formatCurrency(price)}. Anything else?`,
      'order',
      { orderItems: [newItem] }
    )
  }

  // Handle text input submission
  const handleTextSubmit = async () => {
    if (!inputText.trim()) return

    const text = inputText.trim()
    setInputText('')

    // Check if it's a price response
    if (pendingNegotiation) {
      const priceMatch = text.match(/\$?(\d+(?:\.\d{1,2})?)/)
      if (priceMatch) {
        const price = parseFloat(priceMatch[1])
        addCustomerMessage(text)
        handlePriceInput(price)
        return
      }
    }

    addCustomerMessage(text)
    await processOrderText(text)
  }

  // Export conversation for TTS generation
  const exportForTTS = (): TTSExportItem[] => {
    return messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      text: msg.ttsText || msg.content,
      timestamp: msg.timestamp.toISOString(),
      language: 'en-US',
      voice: msg.role === 'customer' ? 'customer' : 'system',
    }))
  }

  const downloadTTSScript = () => {
    const ttsData = exportForTTS()
    const blob = new Blob([JSON.stringify(ttsData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-tts-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Reset conversation
  const resetConversation = () => {
    setMessages([])
    setCurrentOrder([])
    setPendingNegotiation(null)
    setInputText('')
    setCashReceived('')
    setIsPaymentComplete(false)
    setShowCompletionNotification(false)
    setCompletionCountdown(5)
    setTimeout(() => {
      addSystemMessage(
        'Welcome! I\'m ready to take your order. What would you like today?',
        'text'
      )
    }, 100)
  }

  // Handle payment - Cash only
  const handlePayment = async () => {
    if (currentOrder.length === 0) return

    setIsProcessingPayment(true)

    const received = parseFloat(cashReceived)
    if (isNaN(received) || received < orderTotal) {
      alert('Please enter a valid amount equal to or greater than the total.')
      setIsProcessingPayment(false)
      return
    }

    const change = received - orderTotal

    try {
      // Save transaction to database
      const transactionData = {
        items: currentOrder.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price || 0,
          subtotal: (item.price || 0) * item.quantity
        })),
        total: orderTotal,
        paymentMethod: 'CASH',
        cashReceived: received,
        change: change,
        shiftId: currentShift?.id || null,
        conversation: messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString()
        }))
      }

      // Call API to save transaction
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      })

      if (!response.ok) {
        console.error('Failed to save transaction')
      }

      // Add payment completion message
      addSystemMessage(
        `Payment received: ${formatCurrency(received)}. Change: ${formatCurrency(change)}. Order complete! Thank you!`,
        'complete'
      )

      setIsPaymentComplete(true)
    } catch (error) {
      console.error('Error saving transaction:', error)
      // Still complete the payment even if save fails
      addSystemMessage(
        `Payment received: ${formatCurrency(received)}. Change: ${formatCurrency(change)}. Order complete!`,
        'complete'
      )
      setIsPaymentComplete(true)
    }

    setIsProcessingPayment(false)
  }

  // Calculate order total
  const orderTotal = currentOrder.reduce((sum, item) =>
    sum + (item.price || 0) * item.quantity, 0
  )

  // Format time for timeline
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Audio visualization
  const setupAudioVisualization = (audio: HTMLAudioElement) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    const audioContext = audioContextRef.current
    const source = audioContext.createMediaElementSource(audio)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256

    source.connect(analyser)
    analyser.connect(audioContext.destination)
    analyserRef.current = analyser

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateVolume = () => {
      if (!analyserRef.current) return

      analyserRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      setAudioVolume(average / 255)

      animationFrameRef.current = requestAnimationFrame(updateVolume)
    }

    updateVolume()
  }

  // Play simulation
  const playSimulation = async () => {
    try {
      const response = await fetch('/tts/conversations.json')
      const data = await response.json()
      const scenario = data[selectedScenario]

      if (!scenario || scenario.length === 0) {
        alert('No conversation data found for this scenario')
        return
      }

      // Reset state
      setMessages([])
      setCurrentOrder([])
      setCurrentSimulationIndex(0)
      setIsSimulationPlaying(true)
      setApiLogs([]) // Clear previous logs

      addApiLog('simulation', `Starting "${selectedScenario}" scenario`, {
        totalMessages: scenario.length,
        scenario: selectedScenario
      })

      // Play messages sequentially
      playNextMessage(scenario, 0)
    } catch (error) {
      console.error('Error loading simulation:', error)
      addApiLog('error', 'Failed to load simulation', { error: (error as Error).message })
      alert('Failed to load simulation')
    }
  }

  const playNextMessage = async (scenario: any[], index: number) => {
    if (index >= scenario.length) {
      setIsSimulationPlaying(false)
      setCurrentSimulationIndex(0)
      addApiLog('simulation', 'Simulation complete', { totalMessages: scenario.length })
      return
    }

    const msg = scenario[index]
    setCurrentSimulationIndex(index)

    // Process order actions if present
    if (msg.orderAction) {
      const { type, items } = msg.orderAction

      if (type === 'add') {
        setCurrentOrder(prev => {
          const updated = [...prev]
          items.forEach((newItem: any) => {
            const existingIdx = updated.findIndex(i =>
              i.name.toLowerCase() === newItem.name.toLowerCase()
            )
            if (existingIdx >= 0) {
              updated[existingIdx].quantity += newItem.quantity
            } else {
              updated.push({
                name: newItem.name,
                quantity: newItem.quantity,
                price: newItem.price,
                confirmed: true
              })
            }
          })
          return updated
        })
      } else if (type === 'update') {
        setCurrentOrder(prev => {
          const updated = [...prev]
          items.forEach((updateItem: any) => {
            const idx = updated.findIndex(i =>
              i.name.toLowerCase() === updateItem.name.toLowerCase()
            )
            if (idx >= 0) {
              updated[idx].quantity = updateItem.quantity
            }
          })
          return updated
        })
      } else if (type === 'remove') {
        setCurrentOrder(prev =>
          prev.filter(item =>
            !items.some((r: any) =>
              r.name.toLowerCase() === item.name.toLowerCase()
            )
          )
        )
      }
    }

    // Handle payment received - store the amount, but don't trigger notification yet
    // The notification will be triggered after the audio finishes playing
    const hasPayment = msg.paymentReceived
    if (hasPayment) {
      const { amount } = msg.paymentReceived
      setCashReceived(amount.toString())
    }

    // Add message to timeline
    const message: ConversationMessage = {
      id: msg.id,
      role: msg.role,
      type: msg.orderAction ? 'order' : 'text',
      content: msg.text,
      timestamp: new Date(),
      audioUrl: msg.audioPath,
      ttsText: msg.text,
      isPlaying: true,
      orderItems: msg.orderAction?.items
    }

    setMessages(prev => [...prev, message])
    setPlayingMessageId(msg.id)

    // Log the message being played (after adding to timeline)
    addApiLog('simulation', `Playing message ${index + 1}/${scenario.length}`, {
      role: msg.role,
      text: msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : ''),
      audioFile: msg.audioPath?.split('/').pop()
    })

    // For customer messages, call the real parse-order API (non-blocking)
    if (msg.role === 'customer') {
      // Run API call in background - don't await
      (async () => {
        try {
          addApiLog('gemini', 'Sending to Gemini', {
            transcript: msg.text.substring(0, 60) + '...'
          })

          const parseResponse = await fetch('/api/parse-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: msg.text,
              currentOrderItems: currentOrder.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              })),
            }),
          })

          const parseResult = await parseResponse.json()

          if (parseResponse.ok) {
            addApiLog('gemini', 'Gemini Result', {
              items: parseResult.items?.map((i: any) => `${i.quantity}x ${i.name}`),
              actions: parseResult.actions,
              confidence: parseResult.extractionConfidence
            })
          } else {
            addApiLog('error', 'Gemini Failed', {
              error: parseResult.error || 'Unknown error',
              status: parseResponse.status
            })
          }
        } catch (error) {
          addApiLog('error', 'API Error', { message: (error as Error).message })
        }
      })()
    }

    // Play audio
    if (msg.audioPath && !isMuted) {
      try {
        const audio = new Audio(msg.audioPath)
        audioRef.current = audio

        // Setup visualization
        audio.addEventListener('loadedmetadata', () => {
          try {
            setupAudioVisualization(audio)
          } catch (err) {
            console.warn('Audio visualization not available:', err)
          }
        })

        audio.addEventListener('ended', () => {
          setPlayingMessageId(null)
          setAudioVolume(0)

          // Update message playing state
          setMessages(prev =>
            prev.map(m => m.id === msg.id ? { ...m, isPlaying: false } : m)
          )

          // If this message had payment info, trigger the notification now
          if (hasPayment) {
            setIsPaymentComplete(true)
            setIsSimulationPlaying(false)
            return
          }

          // Wait before next message
          simulationTimeoutRef.current = setTimeout(() => {
            playNextMessage(scenario, index + 1)
          }, 1000)
        })

        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e)
          // If this message had payment info, trigger the notification
          if (hasPayment) {
            simulationTimeoutRef.current = setTimeout(() => {
              setIsPaymentComplete(true)
              setIsSimulationPlaying(false)
            }, 2000)
          } else {
            // Continue to next message even if audio fails
            simulationTimeoutRef.current = setTimeout(() => {
              playNextMessage(scenario, index + 1)
            }, 2000)
          }
        })

        await audio.play()
      } catch (error) {
        console.error('Error playing audio:', error)
        // If this message had payment info, trigger the notification
        if (hasPayment) {
          simulationTimeoutRef.current = setTimeout(() => {
            setIsPaymentComplete(true)
            setIsSimulationPlaying(false)
          }, 2000)
        } else {
          // Continue to next message
          simulationTimeoutRef.current = setTimeout(() => {
            playNextMessage(scenario, index + 1)
          }, 2000)
        }
      }
    } else {
      // No audio, just wait and continue
      // If this message had payment info, trigger the notification after a delay
      if (hasPayment) {
        simulationTimeoutRef.current = setTimeout(() => {
          setIsPaymentComplete(true)
          setIsSimulationPlaying(false)
        }, 2000)
      } else {
        simulationTimeoutRef.current = setTimeout(() => {
          playNextMessage(scenario, index + 1)
        }, 2000)
      }
    }
  }

  const stopSimulation = () => {
    setIsSimulationPlaying(false)
    setPlayingMessageId(null)
    setAudioVolume(0)

    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current)
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Conversation Simulation</h1>
            <p className="text-sm text-slate-500">
              Voice ordering with timeline and TTS export
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTTSScript}
              disabled={messages.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Export TTS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetConversation}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            {currentShift ? (
              <Badge className="bg-green-500">Shift Active</Badge>
            ) : (
              <Badge variant="destructive">No Shift</Badge>
            )}
          </div>
        </div>

        {/* Simulation Controls */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Select Scenario
                </label>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  disabled={isSimulationPlaying}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                >
                  <option value="simple_order">Simple Order</option>
                  <option value="negotiation">Price Negotiation</option>
                  <option value="complex_order">Complex Order</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {!isSimulationPlaying ? (
                  <Button
                    onClick={playSimulation}
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Play Simulation
                  </Button>
                ) : (
                  <Button
                    onClick={stopSimulation}
                    size="lg"
                    variant="destructive"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Stop
                  </Button>
                )}
              </div>

              {/* Audio Visualization */}
              {isSimulationPlaying && (
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-purple-600" />
                  <div className="w-32 h-8 bg-white rounded-lg border border-purple-200 overflow-hidden flex items-center px-2">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded"
                      animate={{ width: `${audioVolume * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {isSimulationPlaying && (
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="outline" className="bg-white">
                  Playing message {currentSimulationIndex + 1}
                </Badge>
                <div className="flex-1 h-1 bg-white rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-purple-600"
                    animate={{ width: `${((currentSimulationIndex + 1) / messages.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Conversation Timeline */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Conversation Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  <AnimatePresence>
                    {messages.map((msg, index) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex gap-3 ${
                          msg.role === 'customer' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative ${
                            msg.role === 'customer'
                              ? 'bg-blue-500'
                              : 'bg-green-500'
                          }`}
                        >
                          {msg.role === 'customer' ? (
                            <User className="w-5 h-5 text-white" />
                          ) : (
                            <Bot className="w-5 h-5 text-white" />
                          )}
                          {msg.isPlaying && (
                            <motion.div
                              className="absolute inset-0 rounded-full border-2 border-white"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                          )}
                        </div>

                        {/* Message Content */}
                        <div
                          className={`flex-1 max-w-[80%] ${
                            msg.role === 'customer' ? 'text-right' : ''
                          }`}
                        >
                          {/* Person Label */}
                          <p className={`text-xs font-medium mb-1 ${
                            msg.role === 'customer' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {msg.role === 'customer' ? 'Customer' : 'Seller'}
                          </p>
                          <div
                            className={`inline-block p-3 rounded-2xl ${
                              msg.role === 'customer'
                                ? 'bg-blue-500 text-white rounded-tr-sm'
                                : 'bg-white border border-slate-200 rounded-tl-sm'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>

                            {/* Order items display */}
                            {msg.orderItems && msg.orderItems.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200/30">
                                {msg.orderItems.map((item, i) => (
                                  <div
                                    key={i}
                                    className="flex justify-between text-xs opacity-80"
                                  >
                                    <span>{item.quantity}x {item.name}</span>
                                    <span>{formatCurrency(item.price || 0)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Timestamp */}
                          <div
                            className={`flex items-center gap-2 mt-1 text-xs text-slate-400 ${
                              msg.role === 'customer' ? 'justify-end' : ''
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(msg.timestamp)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="pt-4 border-t mt-4">
                  <div className="flex gap-2">
                    {/* Voice Button */}
                    <Button
                      variant={isRecording ? 'destructive' : 'default'}
                      size="icon"
                      className="flex-shrink-0"
                      onMouseDown={!isProcessing ? startRecording : undefined}
                      onMouseUp={!isProcessing ? stopRecording : undefined}
                      onTouchStart={!isProcessing ? startRecording : undefined}
                      onTouchEnd={!isProcessing ? stopRecording : undefined}
                      disabled={isProcessing || !currentShift}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>

                    {/* Text Input */}
                    <Input
                      placeholder={
                        isRecording
                          ? `Recording... ${(recordingDuration / 1000).toFixed(1)}s`
                          : pendingNegotiation
                          ? `Enter price for ${pendingNegotiation.itemName}...`
                          : 'Type your order or speak...'
                      }
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleTextSubmit()
                        }
                      }}
                      disabled={isProcessing || isRecording || !currentShift}
                    />

                    {/* Send Button */}
                    <Button
                      size="icon"
                      onClick={handleTextSubmit}
                      disabled={!inputText.trim() || isProcessing || !currentShift}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                  {isRecording && (
                    <p className="text-xs text-center text-red-500 mt-2 animate-pulse">
                      Recording... Release to send
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary & TTS Info */}
          <div className="space-y-4">
            {/* Current Order */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="w-5 h-5" />
                  Current Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentOrder.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No items yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {currentOrder.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setCurrentOrder(prev => {
                                  const updated = [...prev]
                                  if (updated[index].quantity > 1) {
                                    updated[index].quantity--
                                  } else {
                                    updated.splice(index, 1)
                                  }
                                  return updated
                                })
                              }}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setCurrentOrder(prev => {
                                  const updated = [...prev]
                                  updated[index].quantity++
                                  return updated
                                })
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatCurrency((item.price || 0) * item.quantity)}
                        </span>
                      </div>
                    ))}

                    <div className="pt-2 border-t mt-2">
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span className="text-green-600">
                          {formatCurrency(orderTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Section - Cash Only */}
            {currentOrder.length > 0 && !isPaymentComplete && (
              <Card className="border-green-300 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-green-800">
                    <Banknote className="w-5 h-5" />
                    Cash Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-lg border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-600">Total Amount:</span>
                        <span className="text-lg font-bold text-green-700">{formatCurrency(orderTotal)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-green-700 font-medium">Cash Received:</label>
                      <Input
                        type="number"
                        placeholder="Enter amount received"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="bg-white text-lg"
                      />
                      {cashReceived && parseFloat(cashReceived) >= orderTotal && (
                        <div className="p-2 bg-green-100 rounded-lg">
                          <p className="text-sm text-green-800">
                            Change: <strong className="text-lg">{formatCurrency(parseFloat(cashReceived) - orderTotal)}</strong>
                          </p>
                        </div>
                      )}
                      {cashReceived && parseFloat(cashReceived) < orderTotal && (
                        <p className="text-sm text-red-600">
                          Insufficient amount. Need {formatCurrency(orderTotal - parseFloat(cashReceived))} more.
                        </p>
                      )}
                    </div>

                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                      onClick={handlePayment}
                      disabled={
                        isProcessingPayment ||
                        !cashReceived ||
                        parseFloat(cashReceived) < orderTotal
                      }
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          Receive Payment
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Complete */}
            {isPaymentComplete && (
              <Card className="border-green-500 bg-green-100">
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
                    <p className="text-xl font-bold text-green-800">Payment Received!</p>
                    <div className="space-y-1">
                      <p className="text-sm text-green-700">
                        Total: <strong>{formatCurrency(orderTotal)}</strong>
                      </p>
                      {cashReceived && (
                        <>
                          <p className="text-sm text-green-700">
                            Received: <strong>{formatCurrency(parseFloat(cashReceived))}</strong>
                          </p>
                          <p className="text-sm text-green-700">
                            Change: <strong>{formatCurrency(parseFloat(cashReceived) - orderTotal)}</strong>
                          </p>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-green-600 mt-2">Transaction saved to database</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetConversation}
                      className="mt-3"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      New Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TTS Export Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Volume2 className="w-5 h-5" />
                  Conversation Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Messages</span>
                    <span className="font-medium">{messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer</span>
                    <span className="font-medium">
                      {messages.filter(m => m.role === 'customer').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Seller</span>
                    <span className="font-medium">
                      {messages.filter(m => m.role === 'seller').length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 pt-2">
                    Conversation will be saved to database on payment.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* API Debug Panel */}
            <Card className="border-slate-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Terminal className="w-5 h-5" />
                    API Logs
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDebugPanel(!showDebugPanel)}
                  >
                    {showDebugPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showDebugPanel && (
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {apiLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-2">
                        No API calls yet. Play simulation or use voice/text input.
                      </p>
                    ) : (
                      apiLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded text-xs ${
                            log.type === 'sensevoice' ? 'bg-blue-50 border border-blue-200' :
                            log.type === 'gemini' ? 'bg-purple-50 border border-purple-200' :
                            log.type === 'simulation' ? 'bg-green-50 border border-green-200' :
                            'bg-red-50 border border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className={`text-[10px] ${
                              log.type === 'sensevoice' ? 'bg-blue-100 text-blue-700' :
                              log.type === 'gemini' ? 'bg-purple-100 text-purple-700' :
                              log.type === 'simulation' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {log.type.toUpperCase()}
                            </Badge>
                            <span className="text-slate-400">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="font-medium text-slate-700">{log.title}</p>
                          <pre className="mt-1 text-[10px] text-slate-600 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(log.data, null, 2).slice(0, 500)}
                            {JSON.stringify(log.data, null, 2).length > 500 && '...'}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                  {apiLogs.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs"
                      onClick={() => setApiLogs([])}
                    >
                      Clear Logs
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Pending Negotiation */}
            {pendingNegotiation && (
              <Card className="border-yellow-300 bg-yellow-50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-yellow-800">
                    <DollarSign className="w-5 h-5" />
                    Price Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-yellow-700 mb-2">
                    Enter price for: <strong>{pendingNegotiation.itemName}</strong>
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const price = parseFloat((e.target as HTMLInputElement).value)
                          if (price > 0) {
                            addCustomerMessage(`$${price}`)
                            handlePriceInput(price)
                          }
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPendingNegotiation(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Auto-closing Transaction Complete Notification */}
      <AnimatePresence>
        {showCompletionNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-4" />
              </motion.div>

              <h2 className="text-2xl font-bold text-green-800 mb-2">
                Transaction Complete!
              </h2>

              <div className="space-y-2 mb-6">
                <p className="text-lg text-slate-700">
                  Total: <strong className="text-green-600">{formatCurrency(orderTotal)}</strong>
                </p>
                {cashReceived && (
                  <>
                    <p className="text-slate-600">
                      Cash Received: <strong>{formatCurrency(parseFloat(cashReceived))}</strong>
                    </p>
                    <p className="text-slate-600">
                      Change: <strong className="text-green-600">{formatCurrency(parseFloat(cashReceived) - orderTotal)}</strong>
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Starting new order in {completionCountdown}s...</span>
              </div>

              <div className="mt-4 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-green-500"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
