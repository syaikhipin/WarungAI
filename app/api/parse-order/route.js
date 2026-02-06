import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request) {
  console.log('🔵 [SERVER] Parse Order API called (OpenAI-Compatible Gemini)');

  try {
    // Check if Gemini API key is configured
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.error('❌ [SERVER] Google Gemini API key not configured');
      return NextResponse.json({
        error: 'Google Gemini API key not configured. Please add GOOGLE_GEMINI_API_KEY to your .env file and restart the dev server.'
      }, { status: 500 });
    }

    console.log('✅ [SERVER] Gemini API key found');

    const { transcript, currentOrderItems = [] } = await request.json();

    console.log(`📝 [SERVER] Transcript: "${transcript}"`);
    console.log(`📦 [SERVER] Current Order:`, currentOrderItems.map(i => `${i.quantity}x ${i.name}`).join(', '));

    // Initialize OpenAI-compatible client for Gemini
    const openai = new OpenAI({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      baseURL: process.env.GOOGLE_GEMINI_BASE_URL || 'https://gemini-cli-worker.nur-arifin-akbar.workers.dev/v1',
    });

    // Build current order context
    const currentOrderRef = currentOrderItems.length
      ? currentOrderItems.map(i => `${i.quantity} x ${i.name} @ ${i.price || 'unknown price'}`).join('; ')
      : 'None (empty order)';

    // Natural language extraction prompt (NO MENU REQUIRED)
    const prompt = `You are a warung (small restaurant) transaction assistant. Extract order details from natural spoken Indonesian/Malay/English.

CUSTOMER SAID: "${transcript}"
CURRENT ORDER: ${currentOrderRef}

TASK: Extract items, quantities, and prices from the spoken order. Be VERY TOLERANT of transcription errors and misrepresentations.

RULES:
1. **Item Extraction (FUZZY MATCHING - Handle Transcription Errors):**
   - Extract all food/drink items mentioned
   - Normalize names (e.g., "nasgor" → "nasi goreng", "teh manis" → "teh manis")
   - Handle variations (e.g., "nasi goreng spesial", "nasi goreng biasa")
   - **HANDLE COMMON TRANSCRIPTION ERRORS:**
     - Phonetic similarities: "nasi" vs "nasih", "goreng" vs "goring", "ayam" vs "ayem"
     - Missing/extra letters: "nasi goren", "nasi gorengg", "nas goreng"
     - Word boundaries: "nasigoreng" vs "nasi goreng"
     - Common misspellings: "teh manis" vs "te manis", "es teh" vs "esteh"
     - Number confusion: "dua" vs "duwa", "tiga" vs "tigah"
   - **FUZZY MATCH STRATEGY:**
     - If 70%+ similarity to common items, accept it
     - Prioritize context (if "nasi" is mentioned, likely rice dish)
     - Use phonetic matching for Indonesian/Malay words

2. **Quantity Detection (FLEXIBLE - Handle Transcription Errors):**
   - Default to 1 if not mentioned
   - Recognize specific numbers: "dua", "2", "two", "tiga", "3", "three", etc.
   - **HANDLE NUMBER TRANSCRIPTION ERRORS:**
     - "dua" vs "duwa" vs "du a" → 2
     - "tiga" vs "tigah" vs "ti ga" → 3
     - "empat" vs "empet" vs "em pat" → 4
     - "lima" vs "limah" vs "li ma" → 5
     - "sepuluh" vs "se puluh" vs "10" → 10
   - Handle: "tambah 2" (add 2 more), "ubah jadi 3" (change to 3)
   - **VAGUE QUANTITIES** (mark as needsQuantityConfirmation):
     - "banyak" (many) → suggest 5, mark as vague
     - "sedikit" (a little) → suggest 2, mark as vague
     - "beberapa" (some/several) → suggest 3, mark as vague
     - "sepiring" (a plate) → suggest 1, mark as vague
     - "segelas" (a glass) → suggest 1, mark as vague
     - "bungkus" (pack/portion) → suggest 1, mark as vague
     - "porsi" (portion) → suggest 1, mark as vague
   - **NO QUANTITY** mentioned → default to 1, mark as needsQuantityConfirmation

3. **Price Extraction (Handle Transcription Errors):**
   - Extract prices if mentioned (e.g., "15 ribu", "15000", "15k", "Rp 15.000")
   - Convert to numeric (15 ribu → 15000)
   - **HANDLE PRICE TRANSCRIPTION ERRORS:**
     - "ribu" vs "ribuuu" vs "ri bu" → thousands
     - "15 ribu" vs "15ribu" vs "15 rb" → 15000
     - "lima belas ribu" vs "limabelas ribu" → 15000
     - "sepuluh ribu" vs "10 ribu" vs "10k" → 10000
   - If price NOT mentioned, set price to null and mark needsPriceSuggestion
   - Confidence: "high" if explicit, "medium" if implied, "low" if guessed

4. **Action Detection (Handle Transcription Errors):**
   - **ADD**: "tambah", "add", "plus", "mau", "tambahin", "tam bah" → Add new items or increment quantity
   - **UPDATE**: "ubah jadi", "ganti jadi", "make it", "change to", "ubah", "ganti" → Set to specific quantity
   - **REMOVE**: "cancel", "hapus", "buang", "remove", "delete", "ga jadi", "gajadi" → Remove items
   - **CONFIRM**: "iya", "yes", "betul", "benar", "ok", "oke" → Confirm current order

5. **Currency:**
   - Default to IDR (Indonesian Rupiah)
   - Recognize: "ribu" (thousands), "k" (thousands), "Rp"

6. **Total Detection (Handle Transcription Errors):**
   - If customer mentions total (e.g., "total 35 ribu", "totalnya 35000", "jadi 35 ribu")
   - Handle: "total", "totalnya", "jadi", "jadine", "semuanya"

7. **Context Awareness:**
   - If only seller is speaking (no customer voice detected), treat as seller confirming/clarifying
   - Seller phrases: "jadi", "berarti", "oke jadi", "total", "bayar"
   - Customer phrases: "mau", "pesan", "tambah", "saya mau"

IMPORTANT: This is a MENU-FREE system. Accept ANY item name spoken. Be VERY FORGIVING of transcription errors.

Return ONLY valid JSON (no markdown, no code fences):

{
  "items": [
    {
      "name": "nasi goreng",
      "originalTranscript": "nas goren",
      "correctionApplied": true,
      "quantity": 2,
      "quantityVague": false,
      "quantityPhrase": "dua",
      "price": 15000,
      "priceConfidence": "high",
      "priceSource": "spoken"
    }
  ],
  "actions": {
    "add": [{"name": "item", "quantity": 2, "quantityVague": false, "price": 15000}],
    "update": [{"name": "item", "quantity": 3, "quantityVague": false, "price": 15000}],
    "remove": [{"name": "item"}]
  },
  "totalMentioned": 35000,
  "currency": "IDR",
  "needsPriceSuggestion": ["teh manis"],
  "needsQuantityConfirmation": [
    {
      "name": "nasi goreng",
      "suggestedQuantity": 5,
      "originalPhrase": "banyak",
      "reason": "Vague quantity - seller should confirm"
    }
  ],
  "transcriptionIssues": [
    {
      "original": "nas goren",
      "corrected": "nasi goreng",
      "confidence": 0.85
    }
  ],
  "extractionConfidence": 0.95,
  "rawTranscript": "${transcript}"
}

If the transcript is unclear or ambiguous, return:
{
  "items": [],
  "ambiguous": true,
  "ambiguousQuery": "What did you mean?",
  "possibleInterpretations": ["interpretation 1", "interpretation 2"],
  "rawTranscript": "${transcript}"
}`;

    console.log('✅ [SERVER] Sending to Gemini for extraction (streaming mode)...');

    // Call OpenAI-compatible Gemini API with streaming
    const stream = await openai.chat.completions.create({
      model: process.env.GEMINI_MODEL || 'gemini-3-pro-preview',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      stream: true,
      response_format: { type: 'json_object' }
    });

    // Collect streamed chunks
    let text = '';
    console.log('📥 [SERVER] Receiving streaming response...');

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || '';
      text += content;
    }

    console.log('📥 [SERVER] Stream complete, total length:', text.length);

    console.log('📤 [SERVER] Gemini raw response:', text);

    // Parse JSON from response (handle markdown code fences)
    let parsed;
    try {
      // Remove markdown code fences if present
      const jsonMatch = text.match(/\`\`\`json\n?([\s\S]*?)\n?\`\`\`/) || text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ [SERVER] Failed to parse Gemini response as JSON:', parseError);
      console.error('Raw response:', text);
      return NextResponse.json({
        error: 'Failed to parse AI response. Please try again.',
        details: process.env.NODE_ENV === 'development' ? text : undefined
      }, { status: 500 });
    }

    // Ensure required fields exist
    if (!parsed.items) {
      parsed.items = [];
    }
    if (!parsed.actions) {
      parsed.actions = { add: [], update: [], remove: [] };
    }
    if (!parsed.needsPriceSuggestion) {
      parsed.needsPriceSuggestion = [];
    }
    if (!parsed.needsQuantityConfirmation) {
      parsed.needsQuantityConfirmation = [];
    }

    // Identify items that need price suggestions
    parsed.items.forEach(item => {
      if (!item.price || item.price === null || item.price === 0) {
        if (!parsed.needsPriceSuggestion.includes(item.name)) {
          parsed.needsPriceSuggestion.push(item.name);
        }
      }
    });

    // Identify items that need quantity confirmation (vague quantities)
    parsed.items.forEach(item => {
      if (item.quantityVague) {
        const existing = parsed.needsQuantityConfirmation.find(q => q.name === item.name);
        if (!existing) {
          parsed.needsQuantityConfirmation.push({
            name: item.name,
            suggestedQuantity: item.quantity,
            originalPhrase: item.quantityPhrase || 'not specified',
            reason: 'Vague or unspecified quantity - seller should confirm'
          });
        }
      }
    });

    console.log(`✅ [SERVER] Extraction successful`);
    console.log(`📤 [SERVER] Returning:`, JSON.stringify(parsed, null, 2));

    return NextResponse.json(parsed);

  } catch (error) {
    console.error('❌ [SERVER] Parse error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    // Provide more specific error messages
    let errorMessage = 'Order parsing failed';
    let statusCode = 500;

    // Check for API key errors
    if (error.message?.includes('API key') || error.message?.includes('not configured')) {
      errorMessage = error.message;
      statusCode = 500;
    }
    // Check for Gemini API errors
    else if (error.status === 401 || error.status === 403) {
      errorMessage = 'Invalid Gemini API key. Please check your GOOGLE_GEMINI_API_KEY in .env.local';
      statusCode = 401;
    } else if (error.status === 429) {
      errorMessage = 'Gemini API rate limit exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.status === 400) {
      errorMessage = error.message || 'Invalid request to Gemini API';
      statusCode = 400;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      error: errorMessage,
      items: [],
      actions: { add: [], update: [], remove: [] },
      needsPriceSuggestion: [],
      ambiguous: false,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      errorType: error.name || 'UnknownError'
    }, { status: statusCode });
  }
}
