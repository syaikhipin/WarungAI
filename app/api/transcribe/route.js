import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log('[SERVER] Transcription API called (SenseVoice)');

  try {
    // Check if API key is configured
    if (!process.env.SENSEVOICE_API_KEY) {
      console.error('[SERVER] SenseVoice API key not configured');
      return NextResponse.json({
        error: 'SenseVoice API key not configured. Please add SENSEVOICE_API_KEY to your .env file and restart the dev server.'
      }, { status: 500 });
    }

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

    console.log('[SERVER] Sending to SenseVoice for transcription...');

    // Create FormData for the external API
    const apiFormData = new FormData();
    apiFormData.append('model', 'FunAudioLLM/SenseVoiceSmall');
    apiFormData.append('file', audioFile);

    // Get API URL from env or use default
    const apiUrl = process.env.SENSEVOICE_API_URL || 'https://marine-moll-unipa-72bbad68.koyeb.app/v1/audio/transcriptions';

    // Call the SenseVoice API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENSEVOICE_API_KEY}`,
      },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SERVER] SenseVoice API error:', response.status, errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('[SERVER] SenseVoice transcription successful');

    // Extract text from response
    const text = result.text || '';
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
    }

    return NextResponse.json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      errorType: error.name || 'UnknownError'
    }, { status: 500 });
  }
}
