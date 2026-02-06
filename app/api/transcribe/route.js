import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request) {
  console.log('[SERVER] Transcription API called (Groq Whisper)');

  try {
    // Check if API key is configured
    if (!process.env.GROQ_API_KEY) {
      console.error('[SERVER] Groq API key not configured');
      return NextResponse.json({
        error: 'Groq API key not configured. Please add GROQ_API_KEY to your .env file and restart the dev server.'
      }, { status: 500 });
    }

    console.log('[SERVER] Groq API key found');

    // Initialize Groq client
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const formData = await request.formData();
    const audioFile = formData.get('file');

    if (!audioFile) {
      console.error('[SERVER] No audio file provided');
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('[SERVER] Audio file received, size:', audioFile.size, 'bytes, type:', audioFile.type);

    // Check if file is empty
    if (audioFile.size === 0) {
      console.error('[SERVER] Audio file is empty');
      return NextResponse.json({ error: 'Audio file is empty' }, { status: 400 });
    }

    // Check minimum file size (at least 1KB for valid audio)
    if (audioFile.size < 1000) {
      console.error('[SERVER] Audio file too small:', audioFile.size, 'bytes');
      return NextResponse.json({ error: 'Audio file too small. Please record for longer.' }, { status: 400 });
    }

    console.log('[SERVER] Sending to Groq Whisper for transcription...');

    // Convert the file to a proper format for Groq
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a File object that Groq SDK can handle
    const file = new File([buffer], 'recording.webm', { type: 'audio/webm' });

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3',
      language: 'en', // English
      response_format: 'text',
    });

    console.log('[SERVER] Groq transcription successful');

    // Extract text from response
    const text = typeof transcription === 'string' ? transcription : transcription.text || '';
    console.log('[SERVER] Transcribed text:', text);

    if (!text) {
      console.error('[SERVER] No text in transcription response');
      return NextResponse.json({ error: 'No transcription text received from API' }, { status: 500 });
    }

    console.log('[SERVER] Returning success response');
    return NextResponse.json({ text: text, success: true });

  } catch (error) {
    console.error('Transcription error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    let errorMessage = 'Transcription failed';

    if (error.message) {
      errorMessage = error.message;
    } else if (error.response) {
      errorMessage = `API Error: ${error.response.status} - ${error.response.statusText}`;
    }

    // Check for specific Groq errors
    if (error.status === 401) {
      errorMessage = 'Invalid Groq API key. Please check your GROQ_API_KEY in .env';
    } else if (error.status === 429) {
      errorMessage = 'Groq API rate limit exceeded. Please try again later.';
    } else if (error.status === 400) {
      errorMessage = 'Invalid audio file format. Please try recording again.';
    }

    return NextResponse.json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      errorType: error.name || 'UnknownError'
    }, { status: 500 });
  }
}
