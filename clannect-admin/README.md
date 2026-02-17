# Clannect Admin

Admin panel for managing the Clannect application. Only authorized users with UUIDs from app.clannect.com can access this page.

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase project credentials

### Installation

```bash
npm install
# or
yarn install
```

### Configuration

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Add admin user UUIDs (comma-separated):
```
ADMIN_IDS=uuid-1,uuid-2,uuid-3
```

### Development

```bash
npm run dev
```

The admin panel will be available at [http://localhost:3002](http://localhost:3002)

### Building

```bash
npm run build
npm start
```

## Authorization

The admin panel uses **middleware** to protect routes by checking the user's UUID against the `clannect_admins` database table:

### How It Works

1. **Middleware Check** (`src/middleware.ts`): Every request to `/` is intercepted
2. **User Authentication**: Verifies the user is logged into app.clannect.com via Supabase
3. **Admin Verification**: Queries the `clannect_admins` table for the user's UUID
4. **Access Control**:
   - ✅ User is authenticated AND in `clannect_admins` → Request proceeds to page
   - ❌ User not authenticated OR not in `clannect_admins` → Returns 401/404

### Adding Admins

To grant admin access, insert a row into the `clannect_admins` table:

```sql
INSERT INTO public.clannect_admins (user_uuid, role, created_at)
VALUES ('user-uuid-here', 'super_admin', now());
```

Allowed roles:
- `super_admin` — full admin access
- `moderator` — moderation access (role can be used for custom permissions)

## Project Structure

- `src/middleware.ts` - Route protection middleware (admin auth checks)
- `src/app/` - Next.js app directory (pages & layouts)
  - `page.tsx` - Admin dashboard (protected by middleware)
  - `layout.tsx` - Root layout with Tailwind CSS
  - `globals.css` - Global styles
- `src/components/` - Reusable React components
- `src/lib/` - Utility functions and helpers
  - `supabase.ts` - Supabase client initialization
  - `admin.ts` - Admin authorization logic
- `public/` - Static assets

## Technologies

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase (authentication & database)
