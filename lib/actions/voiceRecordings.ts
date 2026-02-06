'use server'

import prisma from '@/lib/prisma'

export interface VoiceRecordingInput {
  transcription: string
  parsedOrder: object
  confidenceScore: number
  processingTimeMs: number
  audioUrl?: string
}

// Save voice recording metadata
export async function saveVoiceRecording(data: VoiceRecordingInput) {
  const recording = await prisma.voiceRecording.create({
    data: {
      userId: 1,
      transcription: data.transcription,
      parsedOrder: JSON.stringify(data.parsedOrder),
      confidenceScore: data.confidenceScore,
      processingTimeMs: data.processingTimeMs,
      audioUrl: data.audioUrl,
    },
  })
  
  // Return plain object with numbers (not Decimal) - safe for client serialization
  return {
    id: recording.id,
    userId: recording.userId,
    audioUrl: recording.audioUrl,
    transcription: recording.transcription,
    parsedOrder: recording.parsedOrder,
    confidenceScore: Number(recording.confidenceScore), // Convert Decimal to number
    processingTimeMs: recording.processingTimeMs,
    createdAt: recording.createdAt.toISOString(),
  }
}

// Get recent voice recordings
export async function getRecentVoiceRecordings(limit = 50) {
  return prisma.voiceRecording.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
  })
}

// Get voice recordings by date range
export async function getVoiceRecordingsByDateRange(startDate: string, endDate: string) {
  return prisma.voiceRecording.findMany({
    where: {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59'),
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Get voice recording statistics
export async function getVoiceRecordingStats() {
  const recordings = await prisma.voiceRecording.findMany({
    select: {
      confidenceScore: true,
      processingTimeMs: true,
    },
  })

  if (recordings.length === 0) {
    return {
      totalRecordings: 0,
      averageConfidence: 0,
      averageProcessingTime: 0,
    }
  }

  const totalConfidence = recordings.reduce((sum, r) => sum + Number(r.confidenceScore), 0)
  const totalProcessingTime = recordings.reduce((sum, r) => sum + r.processingTimeMs, 0)

  return {
    totalRecordings: recordings.length,
    averageConfidence: totalConfidence / recordings.length,
    averageProcessingTime: Math.round(totalProcessingTime / recordings.length),
  }
}

// Delete old voice recordings (older than 30 days)
export async function cleanupOldVoiceRecordings() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const result = await prisma.voiceRecording.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
    },
  })

  return result.count
}
