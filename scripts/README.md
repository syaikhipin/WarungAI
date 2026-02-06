# TTS Generation for Conversation Simulation

This directory contains scripts to generate Text-to-Speech (TTS) audio files for conversation simulations.

## Prerequisites

Install the required Python packages:

```bash
pip install -r requirements.txt
```

Or install individually:

```bash
pip install gtts pyttsx3
```

## Usage

### Generate TTS for All Scenarios

```bash
python3 scripts/generate_tts.py --scenario all
```

### Generate TTS for Specific Scenario

```bash
python3 scripts/generate_tts.py --scenario simple_order
python3 scripts/generate_tts.py --scenario negotiation
python3 scripts/generate_tts.py --scenario complex_order
```

### Choose TTS Engine

```bash
# Use Google TTS (requires internet, better quality)
python3 scripts/generate_tts.py --engine gtts

# Use pyttsx3 (offline, faster)
python3 scripts/generate_tts.py --engine pyttsx3

# Auto-detect (default)
python3 scripts/generate_tts.py --engine auto
```

### Custom Output Directory

```bash
python3 scripts/generate_tts.py --output-dir custom/path
```

## Available Scenarios

### 1. Simple Order
A basic order with 2 items:
- Customer orders fried rice and sweet tea
- System confirms and provides total
- 5 messages total

### 2. Price Negotiation
Order with price negotiation:
- Customer orders items not in menu
- System asks for prices
- Customer provides prices
- 9 messages total

### 3. Complex Order
Large order with modifications:
- Customer orders multiple items
- Customer modifies quantities
- Customer adds more items
- 9 messages total

## Output

The script generates:
- **Audio files**: `public/tts/msg-{id}_{role}.mp3`
- **Metadata**: `public/tts/conversations.json`

### Metadata Format

```json
{
  "simple_order": [
    {
      "id": "msg-1",
      "role": "system",
      "text": "Welcome! I'm ready to take your order...",
      "audioPath": "/tts/msg-1_system.mp3",
      "filename": "msg-1_system.mp3"
    }
  ]
}
```

## Adding New Scenarios

Edit `scripts/generate_tts.py` and add to the `create_sample_conversations()` function:

```python
def create_sample_conversations():
    return {
        "your_scenario": [
            {
                "id": "msg-1",
                "role": "system",
                "text": "Your message here"
            },
            {
                "id": "msg-2",
                "role": "customer",
                "text": "Customer response"
            }
        ]
    }
```

Then regenerate:

```bash
python3 scripts/generate_tts.py --scenario your_scenario
```

## Voice Characteristics

- **Customer voice**: Default voice (voice 0)
- **System voice**: Alternative voice (voice 1) if available
- **Speech rate**:
  - Customer: 140 words/minute
  - System: 160 words/minute

## Troubleshooting

### Audio files not playing

1. Check file permissions:
   ```bash
   chmod 644 public/tts/*.mp3
   ```

2. Verify files exist:
   ```bash
   ls -la public/tts/
   ```

3. Check browser console for errors

### TTS generation fails

1. Ensure Python packages are installed:
   ```bash
   pip list | grep -E "gtts|pyttsx3"
   ```

2. Try different engine:
   ```bash
   python3 scripts/generate_tts.py --engine pyttsx3
   ```

3. Check internet connection (for gtts)

## Integration with Frontend

The conversation simulation page automatically loads scenarios from `/tts/conversations.json` and plays audio files sequentially with visualization.

### Features

- **Auto-play**: Click "Play Simulation" to start
- **Audio visualization**: Real-time volume meter
- **Progress tracking**: Shows current message and progress bar
- **Mute option**: Toggle audio on/off
- **Scenario selection**: Choose from available scenarios

## Performance

- **gTTS**: Better quality, requires internet, ~1-2 seconds per message
- **pyttsx3**: Offline, faster generation, ~0.5 seconds per message
- **File sizes**: ~10-50KB per message (MP3 format)

## License

MIT
