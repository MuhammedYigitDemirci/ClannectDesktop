# Clannect Landing Page

This is the landing page for clannect.com. It serves as the introduction page with sign up and login buttons.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd clannect-landing
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Then update the values in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the Development Server

```bash
npm run dev
```

The landing page will run on `http://localhost:3001`

### Building for Production

```bash
npm run build
npm start
```

## Features

- **Landing Page**: Beautiful introduction page for Clannect
- **Authentication Check**: Automatically redirects logged-in users to the app
- **Sign Up / Login Buttons**: Direct navigation for new and existing users
- **Responsive Design**: Works on all device sizes

## Domain Configuration

- **Landing Page**: clannect.com → runs on port 3001
- **App**: app.clannect.com → runs on port 3000

## Deployment

You can deploy this to Vercel, the same platform as your main app. Simply connect this repository to a new Vercel project and set it to deploy to the clannect.com domain.

For environment variables on Vercel, add the same Supabase credentials that you use in your main app.
