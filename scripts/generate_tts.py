#!/usr/bin/env python3
"""
TTS Generation Script for Conversation Simulation
Generates audio files for Customer and Seller voices using gTTS or pyttsx3
"""

import json
import os
from pathlib import Path
from typing import List, Dict
import argparse

try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False
    print("Warning: gTTS not available. Install with: pip install gtts")

try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False
    print("Warning: pyttsx3 not available. Install with: pip install pyttsx3")


class TTSGenerator:
    def __init__(self, output_dir: str = "public/tts"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Initialize pyttsx3 engine if available
        self.engine = None
        if PYTTSX3_AVAILABLE:
            self.engine = pyttsx3.init()
            voices = self.engine.getProperty('voices')
            self.customer_voice = voices[0] if len(voices) > 0 else None
            self.seller_voice = voices[1] if len(voices) > 1 else voices[0]

    def generate_with_gtts(self, text: str, filename: str, lang: str = 'en', slow: bool = False, tld: str = 'com'):
        """Generate TTS using Google Text-to-Speech"""
        if not GTTS_AVAILABLE:
            raise RuntimeError("gTTS is not installed")

        tts = gTTS(text=text, lang=lang, slow=slow, tld=tld)
        output_path = self.output_dir / filename
        tts.save(str(output_path))
        print(f"Generated: {output_path}")
        return str(output_path)

    def generate_with_pyttsx3(self, text: str, filename: str, voice_id: str = None, rate: int = 150):
        """Generate TTS using pyttsx3 (offline)"""
        if not PYTTSX3_AVAILABLE or not self.engine:
            raise RuntimeError("pyttsx3 is not installed or initialized")

        if voice_id:
            self.engine.setProperty('voice', voice_id)
        self.engine.setProperty('rate', rate)

        output_path = self.output_dir / filename
        self.engine.save_to_file(text, str(output_path))
        self.engine.runAndWait()
        print(f"Generated: {output_path}")
        return str(output_path)

    def generate_conversation(self, conversation: List[Dict], scenario_name: str = '', use_gtts: bool = True):
        """Generate TTS for entire conversation"""
        results = []

        for i, message in enumerate(conversation):
            msg_id = message.get('id', f'msg-{i}')
            role = message.get('role', 'customer')
            text = message.get('text', '')

            if not text:
                continue

            # Generate filename with scenario prefix to avoid overwrites
            filename = f"{scenario_name}_{msg_id}_{role}.mp3" if scenario_name else f"{msg_id}_{role}.mp3"

            try:
                if use_gtts and GTTS_AVAILABLE:
                    # Customer: US accent (com), Seller: Australian accent (com.au)
                    tld = 'com' if role == 'customer' else 'com.au'
                    slow = False
                    output_path = self.generate_with_gtts(text, filename, slow=slow, tld=tld)
                elif PYTTSX3_AVAILABLE:
                    voice = self.customer_voice if role == 'customer' else self.seller_voice
                    rate = 140 if role == 'customer' else 160
                    output_path = self.generate_with_pyttsx3(
                        text, filename,
                        voice_id=voice.id if voice else None,
                        rate=rate
                    )
                else:
                    print(f"Error: No TTS engine available for: {text[:50]}...")
                    continue

                results.append({
                    'id': msg_id,
                    'role': role,
                    'text': text,
                    'audioPath': f'/tts/{filename}',
                    'filename': filename,
                    **{k: v for k, v in message.items() if k not in ['id', 'role', 'text']}
                })
            except Exception as e:
                print(f"Error generating TTS for message {msg_id}: {e}")

        return results


def create_sample_conversations():
    """Create sample conversation scenarios - Customer and Seller"""
    return {
        "simple_order": [
            {
                "id": "msg-1",
                "role": "seller",
                "text": "Good morning! Welcome to our warung. What would you like to order today?"
            },
            {
                "id": "msg-2",
                "role": "customer",
                "text": "Hi! I'd like two nasi goreng and one es teh manis please."
            },
            {
                "id": "msg-3",
                "role": "seller",
                "text": "Perfect! I've added two nasi goreng at fifteen dollars each, and one es teh manis at five dollars. Would you like anything else?",
                "orderAction": {
                    "type": "add",
                    "items": [
                        {"name": "Nasi Goreng", "quantity": 2, "price": 15},
                        {"name": "Es Teh Manis", "quantity": 1, "price": 5}
                    ]
                }
            },
            {
                "id": "msg-4",
                "role": "customer",
                "text": "No, that's everything. Thank you!"
            },
            {
                "id": "msg-5",
                "role": "seller",
                "text": "Wonderful! Your total comes to thirty five dollars."
            },
            {
                "id": "msg-6",
                "role": "customer",
                "text": "Here's forty dollars cash."
            },
            {
                "id": "msg-7",
                "role": "seller",
                "text": "Payment received! Your change is five dollars. Order complete! Have a great day!",
                "paymentReceived": {
                    "amount": 40,
                    "change": 5,
                    "method": "CASH"
                }
            }
        ],
        "negotiation": [
            {
                "id": "msg-1",
                "role": "seller",
                "text": "Hello! Welcome back. What can I prepare for you?"
            },
            {
                "id": "msg-2",
                "role": "customer",
                "text": "I want three portions of sate ayam, please."
            },
            {
                "id": "msg-3",
                "role": "seller",
                "text": "Sate ayam, excellent choice! I don't have a price set for that item yet. What price would you suggest?"
            },
            {
                "id": "msg-4",
                "role": "customer",
                "text": "How about eight dollars per portion?"
            },
            {
                "id": "msg-5",
                "role": "seller",
                "text": "Eight dollars sounds fair! I've added three sate ayam at eight dollars each. That's twenty four dollars total. Anything else?",
                "orderAction": {
                    "type": "add",
                    "items": [
                        {"name": "Sate Ayam", "quantity": 3, "price": 8}
                    ]
                }
            },
            {
                "id": "msg-6",
                "role": "customer",
                "text": "Yes, add two es kopi susu."
            },
            {
                "id": "msg-7",
                "role": "seller",
                "text": "Es kopi susu, great! I need a price for that as well. What would be reasonable?"
            },
            {
                "id": "msg-8",
                "role": "customer",
                "text": "Let's say four fifty each."
            },
            {
                "id": "msg-9",
                "role": "seller",
                "text": "Perfect! Added two es kopi susu at four fifty each. Your new total is thirty three dollars. Anything more?",
                "orderAction": {
                    "type": "add",
                    "items": [
                        {"name": "Es Kopi Susu", "quantity": 2, "price": 4.5}
                    ]
                }
            },
            {
                "id": "msg-10",
                "role": "customer",
                "text": "That's all, thanks!"
            },
            {
                "id": "msg-11",
                "role": "seller",
                "text": "Excellent! Your final total is thirty three dollars."
            },
            {
                "id": "msg-12",
                "role": "customer",
                "text": "Here's forty dollars cash."
            },
            {
                "id": "msg-13",
                "role": "seller",
                "text": "Payment received! Your change is seven dollars. Order complete! Thank you and see you again!",
                "paymentReceived": {
                    "amount": 40,
                    "change": 7,
                    "method": "CASH"
                }
            }
        ],
        "complex_order": [
            {
                "id": "msg-1",
                "role": "seller",
                "text": "Good afternoon! Ready to take your order. What would you like?"
            },
            {
                "id": "msg-2",
                "role": "customer",
                "text": "I need five nasi goreng, three ayam goreng, and two soto ayam."
            },
            {
                "id": "msg-3",
                "role": "seller",
                "text": "Got it! I've added five nasi goreng at fifteen dollars each, three ayam goreng at twelve dollars each, and two soto ayam at ten dollars each. Anything else?",
                "orderAction": {
                    "type": "add",
                    "items": [
                        {"name": "Nasi Goreng", "quantity": 5, "price": 15},
                        {"name": "Ayam Goreng", "quantity": 3, "price": 12},
                        {"name": "Soto Ayam", "quantity": 2, "price": 10}
                    ]
                }
            },
            {
                "id": "msg-4",
                "role": "customer",
                "text": "Actually, make the nasi goreng just three portions instead."
            },
            {
                "id": "msg-5",
                "role": "seller",
                "text": "No problem! Updated nasi goreng to three portions. Your current total is one hundred one dollars.",
                "orderAction": {
                    "type": "update",
                    "items": [
                        {"name": "Nasi Goreng", "quantity": 3, "price": 15}
                    ]
                }
            },
            {
                "id": "msg-6",
                "role": "customer",
                "text": "And add four jus mangga please."
            },
            {
                "id": "msg-7",
                "role": "seller",
                "text": "Excellent! I've added four jus mangga at five dollars each. Your total is now one hundred twenty one dollars. Anything more?",
                "orderAction": {
                    "type": "add",
                    "items": [
                        {"name": "Jus Mangga", "quantity": 4, "price": 5}
                    ]
                }
            },
            {
                "id": "msg-8",
                "role": "customer",
                "text": "Can you also add two kerupuk? How much are those?"
            },
            {
                "id": "msg-9",
                "role": "seller",
                "text": "I don't have a price for kerupuk yet. What would you like to pay for them?"
            },
            {
                "id": "msg-10",
                "role": "customer",
                "text": "Two dollars each is fine."
            },
            {
                "id": "msg-11",
                "role": "seller",
                "text": "Perfect! Added two kerupuk at two dollars each. Your final total is one hundred twenty five dollars. That's everything?",
                "orderAction": {
                    "type": "add",
                    "items": [
                        {"name": "Kerupuk", "quantity": 2, "price": 2}
                    ]
                }
            },
            {
                "id": "msg-12",
                "role": "customer",
                "text": "Yes, that's all. Thank you!"
            },
            {
                "id": "msg-13",
                "role": "seller",
                "text": "Wonderful! One hundred twenty five dollars total."
            },
            {
                "id": "msg-14",
                "role": "customer",
                "text": "Here's one hundred fifty dollars cash."
            },
            {
                "id": "msg-15",
                "role": "seller",
                "text": "Payment received! Your change is twenty five dollars. Order complete! Thank you for visiting!",
                "paymentReceived": {
                    "amount": 150,
                    "change": 25,
                    "method": "CASH"
                }
            }
        ]
    }


def main():
    parser = argparse.ArgumentParser(description='Generate TTS audio for conversations')
    parser.add_argument('--scenario', type=str, choices=['simple_order', 'negotiation', 'complex_order', 'all'],
                        default='all', help='Conversation scenario to generate')
    parser.add_argument('--output-dir', type=str, default='public/tts',
                        help='Output directory for audio files')
    parser.add_argument('--engine', type=str, choices=['gtts', 'pyttsx3', 'auto'],
                        default='auto', help='TTS engine to use')

    args = parser.parse_args()

    # Check available engines
    if args.engine == 'auto':
        use_gtts = GTTS_AVAILABLE
        if not use_gtts and not PYTTSX3_AVAILABLE:
            print("Error: No TTS engine available. Install gtts or pyttsx3:")
            print("   pip install gtts")
            print("   pip install pyttsx3")
            return
    elif args.engine == 'gtts':
        if not GTTS_AVAILABLE:
            print("Error: gTTS not available. Install with: pip install gtts")
            return
        use_gtts = True
    else:
        if not PYTTSX3_AVAILABLE:
            print("Error: pyttsx3 not available. Install with: pip install pyttsx3")
            return
        use_gtts = False

    # Initialize generator
    generator = TTSGenerator(output_dir=args.output_dir)

    # Get conversations
    conversations = create_sample_conversations()

    # Generate TTS
    scenarios_to_generate = [args.scenario] if args.scenario != 'all' else conversations.keys()

    all_results = {}
    for scenario in scenarios_to_generate:
        print(f"\nGenerating TTS for scenario: {scenario}")
        conversation = conversations[scenario]
        results = generator.generate_conversation(conversation, scenario_name=scenario, use_gtts=use_gtts)
        all_results[scenario] = results

    # Save metadata
    metadata_path = Path(args.output_dir) / 'conversations.json'
    with open(metadata_path, 'w') as f:
        json.dump(all_results, f, indent=2)

    print(f"\nAll done! Generated {sum(len(r) for r in all_results.values())} audio files")
    print(f"Metadata saved to: {metadata_path}")


if __name__ == '__main__':
    main()
