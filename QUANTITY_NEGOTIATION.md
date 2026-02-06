# Quantity Negotiation Feature - Complete! ✅

## What Was Added

I've added a **quantity negotiation** feature that allows the seller to confirm/adjust quantities when customers use vague terms or don't specify exact amounts.

---

## How It Works

### 1. Voice Input Examples

**Vague Quantities:**
- "banyak nasi goreng" (many nasi goreng) → suggests 5
- "sedikit teh manis" (a little tea) → suggests 2
- "beberapa roti" (some bread) → suggests 3
- "sepiring ayam" (a plate of chicken) → suggests 1
- "segelas jus" (a glass of juice) → suggests 1

**No Quantity Mentioned:**
- "nasi goreng" → defaults to 1, asks for confirmation

### 2. Flow

```
1. Customer speaks: "banyak nasi goreng, sedikit teh manis"
   ↓
2. Groq Whisper transcribes
   ↓
3. Gemini extracts:
   - nasi goreng: quantity=5, quantityVague=true, phrase="banyak"
   - teh manis: quantity=2, quantityVague=true, phrase="sedikit"
   ↓
4. System shows Quantity Confirmation Dialog:
   ┌─────────────────────────────────────┐
   │ 📊 Quantity Confirmation            │
   ├─────────────────────────────────────┤
   │ nasi goreng                         │
   │ Said: "banyak"                      │
   │ Quantity: [5] (suggested: 5)        │
   │                                     │
   │ teh manis                           │
   │ Said: "sedikit"                     │
   │ Quantity: [2] (suggested: 2)        │
   │                                     │
   │ [Skip] [Confirm Quantities]         │
   └─────────────────────────────────────┘
   ↓
5. Seller adjusts if needed (e.g., changes 5 to 3)
   ↓
6. Then shows Price Dialog (if prices not mentioned)
   ↓
7. Items added to order
```

---

## Files Modified

### 1. [app/api/parse-order/route.js](app/api/parse-order/route.js)

**Added vague quantity detection:**
```javascript
2. **Quantity Detection (FLEXIBLE - seller confirms):**
   - **VAGUE QUANTITIES** (mark as needsQuantityConfirmation):
     - "banyak" (many) → suggest 5
     - "sedikit" (a little) → suggest 2
     - "beberapa" (some/several) → suggest 3
     - "sepiring" (a plate) → suggest 1
     - "segelas" (a glass) → suggest 1
     - "bungkus" (pack/portion) → suggest 1
     - "porsi" (portion) → suggest 1
   - **NO QUANTITY** mentioned → default to 1, mark as needsQuantityConfirmation
```

**Added to response:**
```json
{
  "needsQuantityConfirmation": [
    {
      "name": "nasi goreng",
      "suggestedQuantity": 5,
      "originalPhrase": "banyak",
      "reason": "Vague quantity - seller should confirm"
    }
  ]
}
```

### 2. [app/(main)/orders/OrderingClient.tsx](app/(main)/orders/OrderingClient.tsx)

**Added state:**
```typescript
const [pendingQuantityItems, setPendingQuantityItems] = useState<PendingQuantityItem[]>([])
const [showQuantityDialog, setShowQuantityDialog] = useState(false)
const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({})
```

**Added confirmation function:**
```typescript
const confirmPendingQuantities = () => {
  // Collects confirmed quantities
  // Then shows price dialog if needed
}
```

**Added UI dialog:**
- Shows items with vague quantities
- Displays what customer said ("banyak", "sedikit", etc.)
- Shows suggested quantity
- Allows seller to adjust
- Flows into price confirmation if needed

---

## Usage Examples

### Example 1: Vague Quantity
```
Speak: "banyak nasi goreng 15 ribu"

Result:
1. Quantity dialog appears
   - nasi goreng: [5] (suggested: 5)
   - Said: "banyak"
2. Seller confirms or adjusts (e.g., changes to 3)
3. Item added: 3x nasi goreng @ Rp 15,000
```

### Example 2: No Quantity + No Price
```
Speak: "nasi goreng"

Result:
1. Quantity dialog appears
   - nasi goreng: [1] (suggested: 1)
   - Said: "not specified"
2. Seller confirms quantity (e.g., 2)
3. Price dialog appears
   - nasi goreng: Rp [____]
4. Seller enters price (e.g., 15000)
5. Item added: 2x nasi goreng @ Rp 15,000
```

### Example 3: Mixed Vague and Specific
```
Speak: "dua nasi goreng, banyak teh manis"

Result:
1. Quantity dialog appears ONLY for teh manis
   - teh manis: [5] (suggested: 5)
   - Said: "banyak"
2. Seller adjusts (e.g., 3)
3. Items added:
   - 2x nasi goreng (specific - no confirmation needed)
   - 3x teh manis (confirmed by seller)
```

---

## Why This Is Useful for Warungs

1. **Natural Speech** - Customers don't always say exact numbers
2. **Seller Control** - Seller knows what's available and can adjust
3. **Flexible** - Handles Indonesian/Malay quantity terms
4. **Context-Aware** - "banyak" for drinks might be different than "banyak" for food
5. **No Training Needed** - Seller just confirms what makes sense

---

## Vague Quantity Terms Supported

| Term | Language | Suggested Qty | Meaning |
|------|----------|---------------|---------|
| banyak | Indonesian/Malay | 5 | many |
| sedikit | Indonesian/Malay | 2 | a little |
| beberapa | Indonesian/Malay | 3 | some/several |
| sepiring | Indonesian/Malay | 1 | a plate |
| segelas | Indonesian/Malay | 1 | a glass |
| bungkus | Indonesian/Malay | 1 | pack/portion |
| porsi | Indonesian/Malay | 1 | portion |
| (none) | - | 1 | not specified |

---

## Testing

### Test 1: Vague Quantity
```bash
npm run dev
# Speak: "banyak nasi goreng"
# Expected: Quantity dialog with suggested 5
```

### Test 2: Multiple Vague
```bash
# Speak: "banyak nasi goreng, sedikit teh"
# Expected: Quantity dialog for both items
```

### Test 3: Mixed
```bash
# Speak: "dua nasi goreng, banyak teh"
# Expected: Quantity dialog only for teh
```

---

## Complete Transaction Flow

```
Voice Input
    ↓
Transcription (Groq Whisper)
    ↓
Extraction (Gemini)
    ↓
Quantity Vague? ──Yes──> Quantity Dialog ──> Seller Confirms
    ↓ No                                            ↓
Price Missing? ──Yes──> Price Dialog ──> Seller Enters
    ↓ No                                            ↓
Add to Order
    ↓
Payment
    ↓
Transaction Saved
```

---

## Summary

✅ **Vague quantity detection** - Recognizes "banyak", "sedikit", etc.
✅ **Quantity confirmation dialog** - Seller can adjust suggested quantities
✅ **Seamless flow** - Quantity → Price → Order
✅ **Natural for warungs** - Matches real-world conversations
✅ **Flexible** - Seller has final say on quantities

The system now handles the reality of warung transactions where quantities are often negotiated based on what's available and what the customer actually wants!
