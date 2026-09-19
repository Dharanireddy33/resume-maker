# SmartHire - AI-Powered Resume & Job Matching Platform

SmartHire is a full-stack web application that helps job seekers analyze their resumes against ATS requirements, match them with job descriptions, identify skill gaps, improve their applications with AI, and generate professional cover letters.

## Features

### Free Plan
- Basic ATS Resume Analysis (keyword, skills, experience, education scores)
- Resume upload (PDF & DOCX)
- Basic skill extraction and keyword analysis
- Limited job matching
- 5 analyses per month

### Pro Plan
- Advanced ATS Analysis with AI
- Resume-Job semantic matching with skill gap analysis
- AI-powered resume improvement suggestions
- AI-generated professional cover letters
- Detailed ATS reports and analysis history
- 100 analyses per month
- Personalized recommendations

## Tech Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend/Database:** Supabase (PostgreSQL with Row Level Security)
- **Auth:** Supabase Authentication (email/password)
- **AI/NLP:** OpenAI or Google Gemini (via Supabase Edge Functions)
- **Payments:** Razorpay (Test Mode)
- **File Parsing:** pdfjs-dist (PDF), mammoth (DOCX)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

The Supabase credentials are pre-configured in `.env`. You need to add the following for AI and Razorpay:

```env
# Frontend (already configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Add this for Razorpay checkout (public key, safe for frontend)
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### 3. Supabase Configuration

The database schema is already applied via migration. Tables created:
- `profiles` - User profile data
- `plans` - Free and Pro plan definitions
- `subscriptions` - User subscription status
- `usage` - Monthly usage tracking (enforces limits server-side)
- `analyses` - Saved resume analysis results
- `job_matches` - Saved resume-job matching results
- `payments` - Razorpay payment records with verification

Row Level Security is enabled on all tables. Users can only access their own data.

### 4. AI API Configuration

Configure the AI provider in Supabase Edge Function secrets:

**Option A: OpenAI**
- Set `AI_PROVIDER=openai` (or `OPENAI_API_KEY=your_key`)
- Set `AI_API_KEY=your_openai_api_key`

**Option B: Google Gemini**
- Set `AI_PROVIDER=gemini`
- Set `AI_API_KEY=your_gemini_api_key`

If no AI key is configured, the AI edge function returns a 503 error and the frontend falls back to the built-in local analysis engine (basic keyword/skill matching without AI).

### 5. Razorpay Test Mode Configuration

1. Create a Razorpay account at https://razorpay.com
2. Go to Settings > API Keys > Generate Test Key
3. Set the following as Supabase Edge Function secrets:
   - `RAZORPAY_KEY_ID` - Your test key ID
   - `RAZORPAY_KEY_SECRET` - Your test key secret
   - `RAZORPAY_WEBHOOK_SECRET` - Webhook secret (from webhook settings)
4. Add `VITE_RAZORPAY_KEY_ID` to your `.env` file (the public key ID, safe for frontend)
5. Set the webhook URL in Razorpay dashboard to:
   `https://your-project.supabase.co/functions/v1/razorpay-webhook`
6. Subscribe to `payment.captured` and `payment.failed` events

**IMPORTANT:** Never expose `RAZORPAY_KEY_SECRET` to the frontend. It is only used in edge functions.

### 6. Database Setup

The schema migration has already been applied. If you need to re-apply or modify, use the Supabase MCP tools.

### 7. Running the Application

```bash
npm run dev
```

The app runs on the Vite dev server (typically http://localhost:5173).

### 8. Switching Razorpay from Test Mode to Live Mode

1. In the Razorpay dashboard, generate Live API keys
2. Update the Supabase Edge Function secrets:
   - `RAZORPAY_KEY_ID` - Your live key ID
   - `RAZORPAY_KEY_SECRET` - Your live key secret
   - `RAZORPAY_WEBHOOK_SECRET` - Live webhook secret
3. Update `.env`:
   - `VITE_RAZORPAY_KEY_ID` - Your live key ID
4. Update the webhook URL in Razorpay to point to your production Supabase URL
5. Update `PRO_PRICE_MINOR` in `src/lib/plans.ts` if the price changes

## Architecture

```
Frontend (React)
    ↓
Backend (Supabase Edge Functions)
    ├── ai-analyze       → AI/NLP analysis (OpenAI/Gemini)
    ├── razorpay-order   → Create Razorpay payment order
    ├── razorpay-verify  → Verify payment signature (server-side)
    └── razorpay-webhook → Handle Razorpay webhooks
    ↓
Authentication (Supabase Auth)
    ↓
Database (Supabase PostgreSQL with RLS)
```

### Payment Flow
```
User selects Pro
    ↓
Create Razorpay Order (edge function, server-side)
    ↓
Razorpay Checkout (frontend)
    ↓
Payment completed
    ↓
Verify payment signature (edge function, server-side)
    ↓
Update Supabase subscription
    ↓
Activate Pro
    ↓
Show Pro dashboard
```

Pro is NEVER activated based on frontend claims alone. Payment signature verification happens on the backend.

## Integrating Existing Streamlit Logic (SmartHire_Resume.py)

The application is designed so existing Python/Streamlit resume analysis logic can be integrated:

1. **Resume extraction** - The frontend uses `pdfjs-dist` and `mammoth` for text extraction, mirroring what a Python service would do with `PyPDF2`/`pdfplumber` and `python-docx`.

2. **Local analysis engine** (`src/lib/analysisEngine.ts`) - Contains the ATS scoring, skill extraction, and job matching logic in TypeScript. This mirrors what `SmartHire_Resume.py` does in Python. The logic can be ported function-by-function.

3. **AI service** (`src/lib/aiService.ts` + `supabase/functions/ai-analyze`) - The edge function handles AI calls server-side. To integrate existing Python AI logic, you could:
   - Port the Python prompt templates into the `buildPrompt()` function in the edge function
   - Or deploy the Python logic as a separate API service and call it from the edge function

4. **Matching engine** (`src/lib/analysisEngine.ts` `matchResumeLocally`) - The skill matching logic mirrors a Python implementation. Skill lists and partial match mappings can be extended.

## Security

- All API keys (OpenAI/Gemini, Razorpay secret) are stored as Supabase Edge Function secrets — never exposed to the frontend
- Row Level Security on every database table
- Payment verification happens server-side via HMAC signature verification
- File uploads are validated (type and size) before processing
- No raw stack traces shown to users — all errors produce user-friendly messages

## Project Structure

```
src/
├── components/       # Shared UI components
├── lib/              # Business logic, services, types
│   ├── aiService.ts       # AI edge function caller
│   ├── analysisEngine.ts # Local ATS analysis & job matching
│   ├── auth.tsx           # Auth context provider
│   ├── fileParser.ts      # PDF/DOCX text extraction
│   ├── plans.ts           # Plan features & pricing config
│   ├── razorpay.ts        # Razorpay frontend helpers
│   ├── supabase.ts        # Supabase client
│   ├── types.ts           # TypeScript types
│   └── usage.ts           # Usage tracking
├── pages/            # Route pages (15 pages)
└── App.tsx           # Router setup

supabase/
├── config.toml       # Edge function config
└── functions/
    ├── ai-analyze/         # AI analysis edge function
    ├── razorpay-order/    # Create payment order
    ├── razorpay-verify/   # Verify payment signature
    └── razorpay-webhook/  # Handle webhooks
```

## Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run typecheck` - TypeScript type checking
- `npm run lint` - ESLint
- `npm run preview` - Preview production build
