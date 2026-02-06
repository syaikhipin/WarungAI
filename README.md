# WarungAI - Voice-Powered POS System

## Introduction

**WarungAI** is a voice-powered Point of Sale (POS) system designed for small restaurants and food businesses. The name "WarungAI" combines "Warung" (Indonesian/Malay for small shop/stall) with "AI" - representing the core functionality of this system: AI-powered voice ordering and payment processing.

This system was developed to solve the problem of slow order-taking in busy food establishments, where staff need to manually type orders. With WarungAI, staff can simply speak to record customer orders.

---

## System Objectives

1. **Simplify Order Taking** - Use voice recognition technology to record orders without typing
2. **Process Multiple Payment Methods** - Support Cash, Card, E-Wallet, and QR Pay
3. **Shift Management** - Record shift open/close with cash counting
4. **Expense Tracking** - Record daily expenses by category
5. **Business Analytics** - Display sales trends, peak hours, and profit

---

## Technologies Used

### Frontend
| Technology | Version | Purpose |
|-----------|-------|----------|
| **Next.js** | 16.0.7 | React framework for full-stack development |
| **React** | 19.2.0 | Library for building user interfaces |
| **TypeScript** | 5.7.2 | Programming language with static typing |
| **Tailwind CSS** | 4.0 | CSS framework for responsive styling |
| **Framer Motion** | 12.23.25 | Animation for UI interactions |
| **Shadcn/ui** | - | Accessible UI components |
| **Recharts** | 2.15.0 | Chart library for analytics display |

### Backend & Database
| Technology | Version | Purpose |
|-----------|-------|----------|
| **Prisma** | 6.1.0 | ORM for PostgreSQL database access |
| **PostgreSQL** | - | Main database (via Supabase) |
| **Resend** | 6.5.2 | Email delivery service |

### AI & Voice Processing
| Technology | Version | Purpose |
|-----------|-------|----------|
| **Google Gemini** | 2.0 | AI for natural language order extraction |
| **Groq Whisper** | - | Speech-to-text (Indonesian/Malay/English) |

---

## Project Structure

\`\`\`
warungai/
├── app/
│   ├── (main)/                    # Pages with navigation
│   │   ├── analytics/             # Analytics dashboard
│   │   ├── menu/                  # Menu management
│   │   ├── expenses/              # Expense tracking
│   │   ├── orders/                # Order taking (main feature)
│   │   ├── conversation/          # Conversation simulation with TTS
│   │   ├── history/               # Transaction history
│   │   ├── shift/                 # Shift management
│   │   └── settings/              # Settings
│   ├── api/                       # API Routes
│   │   ├── transcribe/            # Speech-to-text
│   │   ├── parse-order/           # AI order parsing (Gemini)
│   │   └── email/                 # Email notifications
│   ├── layout.tsx                 # Main layout
│   └── globals.css                # Global CSS styles
│
├── components/
│   ├── Sidebar.tsx                # Desktop navigation
│   ├── MobileNav.tsx              # Mobile navigation
│   └── ui/                        # Shadcn components
│
├── lib/
│   ├── actions/                   # Server actions
│   │   ├── transactions.ts        # Order/payment logic
│   │   ├── shifts.ts              # Shift management
│   │   ├── expenses.ts            # Expenses
│   │   ├── menu.ts                # Menu CRUD
│   │   └── analytics.ts           # Analytics queries
│   ├── prisma.ts                  # Prisma client
│   └── utils.ts                   # Utility functions
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── seed.ts                    # Initial data
│
├── scripts/
│   ├── generate_tts.py            # TTS audio generation
│   ├── requirements.txt           # Python dependencies
│   └── README.md                  # TTS generation guide
│
├── public/
│   └── tts/                       # Generated TTS audio files
│       ├── conversations.json     # Conversation metadata
│       └── *.mp3                  # Audio files
│
└── package.json                   # Dependencies
\`\`\`

---

## Database Schema

### Entity Relationship Diagram (ERD)

\`\`\`
┌─────────────────────┐
│        USER         │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ email               │
│ phone               │
│ businessName        │
│ businessType        │
└──────────┬──────────┘
           │
           │ 1:N (one to many)
           │
     ┌─────┼─────┬──────────┬──────────┬──────────┐
     ▼     ▼     ▼          ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│MENUITEM │ │  SHIFT  │ │TRANSACT. │ │ EXPENSE  │ │VOICERECORD.  │
├─────────┤ ├─────────┤ ├──────────┤ ├──────────┤ ├──────────────┤
│id (PK)  │ │id (PK)  │ │id (PK)   │ │id (PK)   │ │id (PK)       │
│userId   │ │userId   │ │userId    │ │userId    │ │userId        │
│name     │ │openedAt │ │shiftId   │ │shiftId   │ │audioUrl      │
│price    │ │closedAt │ │items[]   │ │amount    │ │transcription │
│category │ │opening  │ │subtotal  │ │category  │ │parsedOrder   │
│aliases[]│ │closing  │ │total     │ │descript. │ │confidence    │
│isAvail. │ │expected │ │payMethod │ │receipt   │ │processingTime│
│imageUrl │ │diff     │ │received  │ │expDate   │ └──────────────┘
└─────────┘ │status   │ │change    │ │createdAt │
            └─────────┘ └──────────┘ └──────────┘

                    ┌──────────────────────┐
                    │   DAILY_SUMMARY      │
                    ├──────────────────────┤
                    │ id (PK)              │
                    │ userId               │
                    │ summaryDate          │
                    │ totalSales           │
                    │ totalExpenses        │
                    │ netProfit            │
                    │ transactionCount     │
                    │ cashPayments         │
                    │ cardPayments         │
                    │ ewalletPayments      │
                    │ qrPayPayments        │
                    │ topSellingItems[]    │
                    └──────────────────────┘
\`\`\`

---

## Key Features

### 1. Voice-Powered Ordering
- Press-and-hold button for voice input without typing
- Suitable for busy restaurant environments
- Real-time transcription with Groq Whisper
- Smart order parsing with AI

### 2. Dual AI Provider Architecture
- **Groq** (Default): Free and very fast using Llama 3.3 70B
- **Anthropic** (Premium): Claude Sonnet for more complex parsing
- Switch providers without restarting the application

### 3. Smart Order Action Detection
- Recognizes action phrases in English
- "add" to add items
- "change" to update quantity
- "remove/cancel" to remove items

### 4. Multiple Payment Methods
- Cash (with automatic change calculation)
- Card
- E-Wallet
- QR Pay

### 5. Shift Management
- Open shift with starting cash
- Close shift with cash counting
- Automatic cash reconciliation
- Shift reports via email

### 6. Expense Tracking
- Record expenses by category
- Upload receipt images
- Daily expense summaries

### 7. Business Analytics
- Sales trend charts (daily/weekly/monthly)
- Peak hours analysis
- Top-selling items
- Payment method breakdown

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Supabase)
- API keys: Groq, Anthropic (optional), Resend

### Installation Steps

\`\`\`bash
# 1. Clone the repository
git clone https://github.com/username/warungai.git
cd warungai

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 4. Setup database
npx prisma generate
npx prisma db push
npx prisma db seed

# 5. Run development server
npm run dev
\`\`\`

### Environment Variables

\`\`\`env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# AI Providers
GROQ_API_KEY="gsk_..."
ANTHROPIC_API_KEY="sk-ant-..."

# Email
RESEND_API_KEY="re_..."

# Configuration
PARSE_ORDER_PROVIDER="groq"
\`\`\`

---

## How to Use

### Taking Orders

1. **Open a Shift** - Go to Shift page and open a new shift with starting cash
2. **Go to Orders Page** - Navigate to the Orders page
3. **Press and Hold Microphone** - Press and hold the microphone button
4. **Speak the Order** - Say the order clearly (e.g., "2 cheeseburgers and 1 coke")
5. **Release Button** - Release to process the order
6. **Review Order** - Check the parsed order items
7. **Select Payment Method** - Choose Cash, Card, E-Wallet, or QR Pay
8. **Complete Transaction** - Click "Complete Order"

### Managing Menu

1. **Go to Menu Page** - Navigate to Menu management
2. **Add New Item** - Click "Add Item" button
3. **Fill Details** - Enter name, price, category
4. **Add Aliases** - Add voice recognition aliases (e.g., "burger", "cheese burger")
5. **Save** - Click save to add to menu

### Viewing Analytics

1. **Go to Analytics Page** - Navigate to Analytics dashboard
2. **Select Date Range** - Choose daily, weekly, or monthly view
3. **View Charts** - See sales trends, peak hours, top items
4. **Export Data** - Export reports to Excel or PDF

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|----------|
| `/api/transcribe` | POST | Transcribe voice to text (Groq Whisper) |
| `/api/parse-order` | POST | Extract items/prices from text (Google Gemini) |
| `/api/suggest-price` | POST | Get AI price suggestion for item |
| `/api/email/send-shift-report` | POST | Send shift report |

---

## Troubleshooting

### Error 1: Microphone Not Accessible
**Cause:** Browser doesn't have microphone permission
**Solution:** Ensure website is accessed via HTTPS and grant microphone permission

### Error 2: Inaccurate Transcription
**Cause:** Low quality audio or background noise
**Solution:** Use a better microphone and reduce background noise

### Error 3: Item Not Recognized
**Cause:** Item name not in menu or no matching alias
**Solution:** Add aliases in menu management

### Error 4: API Rate Limit
**Cause:** Too many API requests in short time
**Solution:** Groq has free tier limits, upgrade to paid plan if needed

---

## Innovation & Unique Features

### 1. Voice-First Design
- Press-and-hold for voice input without typing
- Suitable for busy restaurant environments
- Real-time transcription with Groq Whisper

### 2. Dual AI Provider Architecture
- **Groq** (Default): Free and very fast
- **Anthropic** (Premium): For more complex parsing
- Switch providers without restart

### 3. Smart Order Action Detection
- Recognizes English action phrases
- "add" to add items
- "change" to update quantity
- "remove/cancel" to remove items

### 4. Automatic Cash Reconciliation
- Tracks expected vs actual cash
- Highlights discrepancies
- Shift reports via email

### 5. Real-time Business Analytics
- Live sales tracking
- Peak hours identification
- Top-selling items
- Payment method analysis

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

This project is licensed under the MIT License.

---

## References

1. [Next.js Documentation](https://nextjs.org/docs)
2. [Prisma Documentation](https://www.prisma.io/docs)
3. [Groq API Documentation](https://console.groq.com/docs)
4. [Anthropic API Documentation](https://docs.anthropic.com)
5. [Tailwind CSS Documentation](https://tailwindcss.com/docs)
6. [Shadcn/ui Documentation](https://ui.shadcn.com)

---

*Built with ❤️ for small restaurant businesses*
