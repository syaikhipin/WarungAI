# WarungAI - Quick Setup Guide

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **PostgreSQL database** (we recommend [Supabase](https://supabase.com/) for free hosting)
- **Groq API Key** (free tier available at [console.groq.com](https://console.groq.com/))

## Step-by-Step Setup

### 1. Clone or Download the Project

\`\`\`bash
cd WarungAI
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

This will install all required packages including Next.js, Prisma, React, and AI SDKs.

### 3. Set Up Database

#### Option A: Using Supabase (Recommended - Free)

1. Go to [supabase.com](https://supabase.com/) and create a free account
2. Create a new project
3. Go to **Settings** → **Database**
4. Copy the **Connection String** (URI format)
5. Replace `[YOUR-PASSWORD]` with your database password

#### Option B: Using Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a new database: \`createdb warungai\`
3. Your connection string will be: \`postgresql://localhost:5432/warungai\`

### 4. Configure Environment Variables

1. Copy the example environment file:

\`\`\`bash
cp .env.example .env.local
\`\`\`

2. Edit \`.env.local\` and add your credentials:

\`\`\`env
# Database
DATABASE_URL="postgresql://your-connection-string"
DIRECT_URL="postgresql://your-connection-string"

# Groq API (Required)
GROQ_API_KEY="gsk_your_groq_api_key_here"

# Optional: Anthropic API for advanced parsing
ANTHROPIC_API_KEY="sk-ant-your_key_here"
\`\`\`

### 5. Get Your Groq API Key (Free)

1. Go to [console.groq.com](https://console.groq.com/)
2. Sign up for a free account
3. Navigate to **API Keys**
4. Click **Create API Key**
5. Copy the key and paste it in your \`.env.local\` file

### 6. Initialize Database

Run these commands to set up your database schema and seed initial data:

\`\`\`bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial menu items
npx prisma db seed
\`\`\`

### 7. Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

The application will start at [http://localhost:3000](http://localhost:3000)

### 8. Test the Application

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Navigate to **Shift** page and open a new shift
3. Go to **Orders** page
4. Click and hold the microphone button
5. Say "2 cheeseburgers and 1 coke"
6. Release the button and watch the AI parse your order!

---

## Common Issues & Solutions

### Issue: "GROQ_API_KEY not configured"

**Solution:** Make sure you've:
1. Created a \`.env.local\` file (not just \`.env.example\`)
2. Added your Groq API key to the file
3. Restarted the development server (\`npm run dev\`)

### Issue: "Database connection failed"

**Solution:** Check that:
1. Your database is running
2. The connection string in \`.env.local\` is correct
3. You've run \`npx prisma db push\`

### Issue: "Microphone not working"

**Solution:**
1. Make sure you're using HTTPS or localhost
2. Grant microphone permissions in your browser
3. Check that your microphone is working in other apps

### Issue: "No menu items showing"

**Solution:** Run the seed command:
\`\`\`bash
npx prisma db seed
\`\`\`

---

## Next Steps

Once you have the system running:

1. **Customize Menu** - Go to Menu page and add your own items
2. **Add Voice Aliases** - Add alternative names for better voice recognition
3. **Test Orders** - Try different voice commands
4. **View Analytics** - Check the Analytics page for insights
5. **Manage Shifts** - Practice opening and closing shifts

---

## Optional Enhancements

### Add Text-to-Speech (Optional)

1. Get an ElevenLabs API key from [elevenlabs.io](https://elevenlabs.io/)
2. Add to \`.env.local\`:
   \`\`\`env
   ELEVENLABS_API_KEY="your_key_here"
   \`\`\`

### Add Email Notifications (Optional)

1. Get a Resend API key from [resend.com](https://resend.com/)
2. Add to \`.env.local\`:
   \`\`\`env
   RESEND_API_KEY="re_your_key_here"
   FROM_EMAIL="noreply@yourdomain.com"
   TO_EMAIL="manager@yourdomain.com"
   \`\`\`

---

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review the [Troubleshooting](README.md#troubleshooting) section
- Open an issue on GitHub

---

**Happy ordering! 🎤🍔**
