#!/usr/bin/env python3
"""
Offline Test Script for Conversation Simulation
Tests the conversation flow without hitting external APIs
"""

import json
from pathlib import Path

TTS_DIR = Path(__file__).parent.parent / "public" / "tts"

def load_conversations():
    """Load conversation scenarios from JSON"""
    conversations_path = TTS_DIR / "conversations.json"
    if not conversations_path.exists():
        print(f"Error: {conversations_path} not found")
        return None

    with open(conversations_path, 'r') as f:
        return json.load(f)

def validate_conversation(scenario_name: str, scenario: list):
    """Validate a conversation scenario structure"""
    print(f"\n{'='*60}")
    print(f"Validating Scenario: {scenario_name}")
    print(f"{'='*60}")

    errors = []
    warnings = []

    # Track order state
    current_order = []
    has_payment = False

    for i, msg in enumerate(scenario):
        msg_id = msg.get('id', f'msg-{i}')
        role = msg.get('role')
        text = msg.get('text')
        audio_path = msg.get('audioPath')

        # Validate required fields
        if not role:
            errors.append(f"[{msg_id}] Missing 'role' field")
        elif role not in ['customer', 'seller']:
            errors.append(f"[{msg_id}] Invalid role: '{role}' (expected 'customer' or 'seller')")

        if not text:
            errors.append(f"[{msg_id}] Missing 'text' field")

        if not audio_path:
            warnings.append(f"[{msg_id}] Missing 'audioPath' field")
        else:
            # Check if audio file exists
            audio_file = TTS_DIR / Path(audio_path).name
            if not audio_file.exists():
                warnings.append(f"[{msg_id}] Audio file not found: {audio_path}")

        # Process order actions
        if 'orderAction' in msg:
            action = msg['orderAction']
            action_type = action.get('type')
            items = action.get('items', [])

            if action_type not in ['add', 'update', 'remove']:
                errors.append(f"[{msg_id}] Invalid orderAction type: '{action_type}'")

            for item in items:
                if 'name' not in item:
                    errors.append(f"[{msg_id}] Order item missing 'name'")
                if 'quantity' not in item:
                    errors.append(f"[{msg_id}] Order item missing 'quantity'")
                if 'price' not in item:
                    warnings.append(f"[{msg_id}] Order item missing 'price'")

            # Update order state
            if action_type == 'add':
                for item in items:
                    existing = next((o for o in current_order if o['name'].lower() == item['name'].lower()), None)
                    if existing:
                        existing['quantity'] += item.get('quantity', 1)
                    else:
                        current_order.append({
                            'name': item['name'],
                            'quantity': item.get('quantity', 1),
                            'price': item.get('price', 0)
                        })
            elif action_type == 'update':
                for item in items:
                    existing = next((o for o in current_order if o['name'].lower() == item['name'].lower()), None)
                    if existing:
                        existing['quantity'] = item.get('quantity', existing['quantity'])
            elif action_type == 'remove':
                for item in items:
                    current_order = [o for o in current_order if o['name'].lower() != item['name'].lower()]

        # Check for payment
        if 'paymentReceived' in msg:
            payment = msg['paymentReceived']
            has_payment = True

            if 'amount' not in payment:
                errors.append(f"[{msg_id}] Payment missing 'amount'")
            if 'change' not in payment:
                errors.append(f"[{msg_id}] Payment missing 'change'")
            if 'method' not in payment:
                warnings.append(f"[{msg_id}] Payment missing 'method'")

            # Validate payment amount
            if current_order:
                total = sum((item.get('price', 0) or 0) * item['quantity'] for item in current_order)
                expected_change = payment.get('amount', 0) - total
                actual_change = payment.get('change', 0)

                if abs(expected_change - actual_change) > 0.01:
                    warnings.append(f"[{msg_id}] Change mismatch: expected ${expected_change:.2f}, got ${actual_change:.2f}")

        # Print message
        role_icon = "👤" if role == 'customer' else "🏪"
        print(f"\n{role_icon} [{msg_id}] {role.upper()}: {text[:60]}{'...' if len(text) > 60 else ''}")

        if 'orderAction' in msg:
            action = msg['orderAction']
            print(f"   📦 Order Action: {action['type']}")
            for item in action.get('items', []):
                print(f"      - {item.get('quantity', 1)}x {item['name']} @ ${item.get('price', 'TBD')}")

        if 'paymentReceived' in msg:
            payment = msg['paymentReceived']
            print(f"   💰 Payment: ${payment.get('amount', 0)} received, ${payment.get('change', 0)} change")

    # Final validation
    if not has_payment:
        warnings.append("Scenario does not end with payment")

    # Print summary
    print(f"\n{'-'*60}")
    print(f"Validation Summary for '{scenario_name}':")
    print(f"  Messages: {len(scenario)}")
    print(f"  Customer messages: {sum(1 for m in scenario if m.get('role') == 'customer')}")
    print(f"  Seller messages: {sum(1 for m in scenario if m.get('role') == 'seller')}")
    print(f"  Order actions: {sum(1 for m in scenario if 'orderAction' in m)}")
    print(f"  Has payment: {'Yes' if has_payment else 'No'}")

    if current_order:
        total = sum((item.get('price', 0) or 0) * item['quantity'] for item in current_order)
        print(f"\n  Final Order:")
        for item in current_order:
            subtotal = (item.get('price', 0) or 0) * item['quantity']
            print(f"    - {item['quantity']}x {item['name']}: ${subtotal:.2f}")
        print(f"  Total: ${total:.2f}")

    if errors:
        print(f"\n  ❌ Errors ({len(errors)}):")
        for error in errors:
            print(f"    - {error}")

    if warnings:
        print(f"\n  ⚠️ Warnings ({len(warnings)}):")
        for warning in warnings:
            print(f"    - {warning}")

    if not errors and not warnings:
        print(f"\n  ✅ All validations passed!")
    elif not errors:
        print(f"\n  ✅ No errors found (but {len(warnings)} warnings)")

    return len(errors) == 0

def main():
    print("="*60)
    print("Offline Conversation Validation Test")
    print("="*60)

    conversations = load_conversations()
    if not conversations:
        return

    print(f"\nFound {len(conversations)} scenarios: {', '.join(conversations.keys())}")

    all_valid = True
    for scenario_name, scenario in conversations.items():
        if not validate_conversation(scenario_name, scenario):
            all_valid = False

    print(f"\n{'='*60}")
    if all_valid:
        print("✅ All scenarios validated successfully!")
    else:
        print("❌ Some scenarios have errors")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
