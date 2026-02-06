# WarungAI Project Summary

## What is WarungAI?

**WarungAI** is a complete rewrite of the CakapBayar system in English. It's a voice-powered Point of Sale (POS) system designed for small restaurants and food businesses. The system allows staff to take orders by speaking instead of typing, making order processing faster and more efficient.

## Key Differences from CakapBayar

| Feature | CakapBayar | WarungAI |
|---------|------------|----------|
| **Language** | Malay/Indonesian | English |
| **Menu Items** | Malaysian food (Nasi Lemak, Roti Canai, Teh Tarik) | Western food (Burgers, Pizza, Pasta) |
| **Voice Recognition** | Malay language support | English language support |
| **UI Text** | Malay interface | English interface |
| **Currency** | RM (Ringgit Malaysia) | $ (USD) |
| **Documentation** | Malay README | English README |

## What's Included

### ✅ Complete Project Structure
- Next.js 16 application with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Prisma ORM for database management

### ✅ Database Schema
- 7 database models (User, MenuItem, Shift, Transaction, Expense, DailySummary, VoiceRecording)
- PostgreSQL-ready schema
- Seed file with 20 sample menu items (burgers, pizza, drinks, etc.)

### ✅ API Routes
- `/api/transcribe` - Voice to text using Groq Whisper (English)
- `/api/parse-order` - AI order parsing using Groq/Anthropic
- `/api/text-to-speech` - Text to speech using ElevenLabs
- `/api/config/provider` - AI provider configuration
- `/api/email/send-shift-report` - Email shift reports

### ✅ Application Pages
- **Orders** - Voice-powered order taking (main feature)
- **Menu** - Menu item management with aliases
- **Shift** - Shift management with cash reconciliation
- **Expenses** - Expense tracking by category
- **History** - Transaction history
- **Analytics** - Business analytics dashboard
- **Settings** - Application settings

### ✅ Components
- Sidebar navigation (desktop)
- Mobile navigation
- UI components from Shadcn/ui
- Balance sheet component
- All necessary form components

### ✅ Server Actions
- Transaction management
- Shift operations
- Menu CRUD operations
- Expense tracking
- Analytics queries
- Voice recording storage

### ✅ Documentation
- **README.md** - Comprehensive project documentation
- **SETUP.md** - Quick setup guide for beginners
- **.env.example** - Environment variable template
- Inline code comments

## Sample Menu Items

The seed file includes 20 items across 2 categories:

**Food:**
- Cheeseburger ($8.99)
- Chicken Sandwich ($7.50)
- French Fries ($3.50)
- Caesar Salad ($6.99)
- Margherita Pizza ($12.99)
- Pepperoni Pizza ($14.99)
- Spaghetti Carbonara ($11.50)
- Grilled Chicken ($13.99)
- Fish and Chips ($10.99)
- Hot Dog ($5.50)

**Drinks:**
- Coca Cola ($2.50)
- Pepsi ($2.50)
- Sprite ($2.50)
- Orange Juice ($3.50)
- Apple Juice ($3.50)
- Iced Tea ($2.99)
- Coffee ($3.00)
- Latte ($4.50)
- Cappuccino ($4.50)
- Water ($1.00)

Each item includes voice recognition aliases for better accuracy.

## Technology Stack

### Frontend
- Next.js 16.0.7
- React 19.2.0
- TypeScript 5.7.2
- Tailwind CSS 4.0
- Framer Motion 12.23.25
- Shadcn/ui components
- Recharts 2.15.0

### Backend
- Prisma 6.1.0 (ORM)
- PostgreSQL (database)
- Next.js API Routes

### AI & Voice
- Groq SDK 0.37.0 (Llama 3.3 70B)
- Groq Whisper (speech-to-text)
- Anthropic SDK 0.71.2 (Claude Sonnet)
- ElevenLabs (text-to-speech)

### Other
- Resend 6.5.2 (email)
- date-fns 4.1.0 (date handling)
- Zod 3.24.1 (validation)
- xlsx 0.18.5 (Excel export)
- jspdf 2.5.2 (PDF export)

## How to Get Started

1. **Navigate to the project:**
   \`\`\`bash
   cd WarungAI
   \`\`\`

2. **Follow the setup guide:**
   - Read [SETUP.md](SETUP.md) for step-by-step instructions
   - Or read [README.md](README.md) for comprehensive documentation

3. **Quick start:**
   \`\`\`bash
   npm install
   cp .env.example .env.local
   # Edit .env.local with your API keys
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   npm run dev
   \`\`\`

## Required API Keys

### Essential (Free)
- **Groq API Key** - For voice transcription and order parsing
  - Get it at: [console.groq.com](https://console.groq.com/)
  - Free tier available

### Optional
- **Anthropic API Key** - For advanced order parsing
  - Get it at: [console.anthropic.com](https://console.anthropic.com/)
- **ElevenLabs API Key** - For text-to-speech
  - Get it at: [elevenlabs.io](https://elevenlabs.io/)
- **Resend API Key** - For email notifications
  - Get it at: [resend.com](https://resend.com/)

## Features Comparison

| Feature | Status |
|---------|--------|
| Voice-powered ordering | ✅ Fully functional |
| AI order parsing | ✅ Dual provider (Groq/Anthropic) |
| Menu management | ✅ Full CRUD with aliases |
| Shift management | ✅ Cash reconciliation |
| Multiple payment methods | ✅ Cash, Card, E-Wallet, QR Pay |
| Expense tracking | ✅ By category with receipts |
| Business analytics | ✅ Charts and reports |
| Transaction history | ✅ Full history with search |
| Email notifications | ✅ Shift reports |
| Export to Excel/PDF | ✅ Reports export |
| Mobile responsive | ✅ Full mobile support |
| PWA support | ✅ Progressive Web App |

## Project Structure

\`\`\`
WarungAI/
├── app/                    # Next.js app directory
│   ├── (main)/            # Main application pages
│   │   ├── analytics/     # Analytics dashboard
│   │   ├── menu/          # Menu management
│   │   ├── expenses/      # Expense tracking (perbelanjaan)
│   │   ├── orders/        # Order taking (pesanan)
│   │   ├── history/       # Transaction history (sejarah)
│   │   ├── shift/         # Shift management
│   │   └── settings/      # Settings
│   └── api/               # API routes
│       ├── transcribe/    # Voice to text
│       ├── parse-order/   # Order parsing
│       ├── text-to-speech/# TTS
│       ├── config/        # Configuration
│       └── email/         # Email sending
├── components/            # React components
│   └── ui/               # Shadcn UI components
├── lib/                  # Utilities and actions
│   ├── actions/          # Server actions
│   └── utils/            # Helper functions
├── prisma/               # Database
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
├── public/               # Static assets
├── .env.example          # Environment template
├── README.md             # Main documentation
├── SETUP.md              # Setup guide
└── package.json          # Dependencies
\`\`\`

## Next Steps

1. **Customize the menu** - Replace sample items with your actual menu
2. **Add voice aliases** - Add alternative names for better recognition
3. **Configure email** - Set up shift report emails
4. **Test voice ordering** - Try different voice commands
5. **Deploy** - Deploy to Vercel or your preferred platform

## Support

For questions or issues:
- Check the [README.md](README.md) for detailed documentation
- Review the [SETUP.md](SETUP.md) for setup instructions
- Check the Troubleshooting section in README

---

**Built with ❤️ for small restaurant businesses**
