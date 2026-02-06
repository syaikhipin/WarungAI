import { NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const CONFIG_FILE = join(process.cwd(), '.api-config.json');

async function getProvider() {
  // Check runtime config file first (for toggle without restart)
  try {
    if (existsSync(CONFIG_FILE)) {
      const configContent = await readFile(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(configContent);
      if (config.provider) {
        return config.provider.toLowerCase();
      }
    }
  } catch (fileError) {
    // Config file doesn't exist or is invalid, use env var
  }
  
  // Fallback to environment variable
  return (process.env.PARSE_ORDER_PROVIDER || 'groq').toLowerCase();
}

export async function GET(request) {
  try {
    const provider = await getProvider();
    
    // Check if API keys are configured
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasGroqKey = !!process.env.GROQ_API_KEY;
    const configured = provider === 'anthropic' ? hasAnthropicKey : hasGroqKey;
    
    return NextResponse.json({
      provider: provider === 'anthropic' ? 'anthropic' : 'groq',
      configured,
      hasAnthropicKey,
      hasGroqKey,
    });
  } catch (error) {
    console.error('Provider config error:', error);
    return NextResponse.json(
      { 
        provider: 'groq',
        configured: false,
        error: 'Failed to get provider configuration'
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { provider } = await request.json();
    
    if (provider !== 'anthropic' && provider !== 'groq') {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "anthropic" or "groq"' },
        { status: 400 }
      );
    }

    // Write to runtime config file
    await writeFile(CONFIG_FILE, JSON.stringify({ provider }, null, 2), 'utf-8');
    
    console.log(`✅ [SERVER] Provider updated to: ${provider}`);
    
    // Check API keys
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasGroqKey = !!process.env.GROQ_API_KEY;
    const configured = provider === 'anthropic' ? hasAnthropicKey : hasGroqKey;

    return NextResponse.json({
      provider,
      configured,
      hasAnthropicKey,
      hasGroqKey,
      message: 'Provider updated successfully',
    });
  } catch (error) {
    console.error('Failed to update provider:', error);
    return NextResponse.json(
      { error: 'Failed to update provider configuration' },
      { status: 500 }
    );
  }
}
