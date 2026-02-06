#!/usr/bin/env python3
"""
Test Script for Conversation Simulation
Simulates the conversation flow and tests API endpoints
"""

import json
import time
import requests
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:3000"
TTS_DIR = Path(__file__).parent.parent / "public" / "tts"

def load_conversations():
    """Load conversation scenarios from JSON"""
    conversations_path = TTS_DIR / "conversations.json"
    if not conversations_path.exists():
        print(f"Error: {conversations_path} not found")
        return None

    with open(conversations_path, 'r') as f:
        return json.load(f)

def test_parse_order(transcript: str, current_order: list = None):
    """Test the parse-order API endpoint"""
    if current_order is None:
        current_order = []

    print(f"\n{'='*60}")
    print(f"Testing Parse Order API")
    print(f"{'='*60}")
    print(f"Transcript: \"{transcript}\"")
    print(f"Current Order: {current_order}")

    try:
        response = requests.post(
            f"{BASE_URL}/api/parse-order",
            json={
                "transcript": transcript,
                "currentOrderItems": current_order
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        print(f"\nStatus Code: {response.status_code}")

        if response.ok:
            result = response.json()
            print(f"\n✅ Parse Result:")
            print(json.dumps(result, indent=2))
            return result
        else:
            print(f"\n❌ Error: {response.text}")
            return None

    except requests.exceptions.ConnectionError:
        print(f"\n❌ Connection Error: Make sure the dev server is running at {BASE_URL}")
        return None
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return None

def simulate_conversation(scenario_name: str, conversations: dict):
    """Simulate a conversation scenario"""
    if scenario_name not in conversations:
        print(f"Error: Scenario '{scenario_name}' not found")
        return

    scenario = conversations[scenario_name]

    print(f"\n{'#'*60}")
    print(f"# Simulating Scenario: {scenario_name}")
    print(f"{'#'*60}")

    current_order = []

    for msg in scenario:
        role = msg.get('role', 'unknown')
        text = msg.get('text', '')
        msg_id = msg.get('id', 'unknown')

        print(f"\n[{msg_id}] {role.upper()}: {text}")

        # If customer message, test the parse-order API
        if role == 'customer':
            # Simulate sending to parse-order API
            result = test_parse_order(text, current_order)

            if result:
                # Update current order based on actions
                actions = result.get('actions', {})
                items = result.get('items', [])

                # Handle add actions
                for item in actions.get('add', []) + items:
                    existing = next((o for o in current_order if o['name'].lower() == item['name'].lower()), None)
                    if existing:
                        existing['quantity'] += item.get('quantity', 1)
                    else:
                        current_order.append({
                            'name': item['name'],
                            'quantity': item.get('quantity', 1),
                            'price': item.get('price')
                        })

                # Handle update actions
                for item in actions.get('update', []):
                    existing = next((o for o in current_order if o['name'].lower() == item['name'].lower()), None)
                    if existing:
                        existing['quantity'] = item.get('quantity', existing['quantity'])

                # Handle remove actions
                for item in actions.get('remove', []):
                    current_order = [o for o in current_order if o['name'].lower() != item['name'].lower()]

        # Check for order actions in the message
        if 'orderAction' in msg:
            action = msg['orderAction']
            action_type = action.get('type')
            items = action.get('items', [])

            print(f"\n  📦 Order Action: {action_type}")
            for item in items:
                print(f"     - {item['quantity']}x {item['name']} @ ${item.get('price', 'TBD')}")

        # Check for payment received
        if 'paymentReceived' in msg:
            payment = msg['paymentReceived']
            print(f"\n  💰 Payment Received!")
            print(f"     Amount: ${payment['amount']}")
            print(f"     Change: ${payment['change']}")
            print(f"     Method: {payment['method']}")

        # Small delay between messages
        time.sleep(0.5)

    print(f"\n{'='*60}")
    print(f"Simulation Complete!")
    print(f"{'='*60}")

    # Print final order summary
    if current_order:
        print(f"\nFinal Order:")
        total = 0
        for item in current_order:
            subtotal = (item.get('price') or 0) * item['quantity']
            total += subtotal
            print(f"  - {item['quantity']}x {item['name']}: ${subtotal}")
        print(f"\nTotal: ${total}")

def test_transcribe_api():
    """Test the transcribe API with a sample audio file"""
    print(f"\n{'='*60}")
    print(f"Testing Transcribe API (Groq Whisper)")
    print(f"{'='*60}")

    # Check if there's a sample audio file
    sample_audio = TTS_DIR / "msg-2_customer.mp3"

    if not sample_audio.exists():
        print(f"No sample audio file found at {sample_audio}")
        print("Skipping transcribe test")
        return None

    print(f"Using sample audio: {sample_audio}")

    try:
        with open(sample_audio, 'rb') as f:
            response = requests.post(
                f"{BASE_URL}/api/transcribe",
                files={'file': ('recording.webm', f, 'audio/webm')},
                timeout=30
            )

        print(f"\nStatus Code: {response.status_code}")

        if response.ok:
            result = response.json()
            print(f"\n✅ Transcription Result:")
            print(json.dumps(result, indent=2))
            return result
        else:
            print(f"\n❌ Error: {response.text}")
            return None

    except requests.exceptions.ConnectionError:
        print(f"\n❌ Connection Error: Make sure the dev server is running at {BASE_URL}")
        return None
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return None

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Test conversation simulation')
    parser.add_argument('--scenario', type=str,
                        choices=['simple_order', 'negotiation', 'complex_order', 'all'],
                        default='simple_order',
                        help='Scenario to simulate')
    parser.add_argument('--test-transcribe', action='store_true',
                        help='Test the transcribe API')
    parser.add_argument('--test-parse', type=str,
                        help='Test parse-order API with a custom transcript')

    args = parser.parse_args()

    # Test transcribe API if requested
    if args.test_transcribe:
        test_transcribe_api()
        return

    # Test parse API with custom transcript
    if args.test_parse:
        test_parse_order(args.test_parse)
        return

    # Load conversations
    conversations = load_conversations()
    if not conversations:
        return

    # Simulate scenarios
    if args.scenario == 'all':
        for scenario_name in conversations.keys():
            simulate_conversation(scenario_name, conversations)
            print("\n" + "="*60 + "\n")
    else:
        simulate_conversation(args.scenario, conversations)

if __name__ == '__main__':
    main()
