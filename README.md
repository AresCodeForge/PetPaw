# PetPaw 🐾

A modern pet management platform with smart QR tags. Built with Next.js 15, Tailwind CSS, and Supabase.

## Features

### Free Plan
- ✅ Unlimited pets
- ✅ Unlimited QR tags
- ✅ Basic public pet profiles
- ✅ Owner dashboard
- ✅ Email authentication
- ✅ Pet photos (up to 3 per pet)

### Pro Plan (€1.50/year)
- ✅ Everything in Free
- ✅ Medical history & medication notes
- ✅ Vaccination log with date tracking
- ✅ Vet contact information
- ✅ Diet information
- ✅ Lost & Found mode with alerts
- ✅ Pet journal/calendar

### Admin Features
- 👤 User management dashboard
- 📦 Order management system
- 🏷️ Batch QR code generation
- ⬆️ User tier elevation (Free ↔ Pro)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Language**: TypeScript
- **Internationalization**: Custom i18n (English/Greek)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- A Supabase account

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/PetPaw.git
cd PetPaw
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` – Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` – Your Supabase service role key (for admin features)
- `ADMIN_USER_IDS` – Comma-separated list of admin user UUIDs
- `ADMIN_EMAIL` – Comma-separated list of admin email addresses

### 4. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migrations in order from `supabase/migrations/`:
   - `001_profiles_trigger.sql`
   - `002_rls_policies.sql`
   - `003_qr_codes.sql`
   - ... and so on
3. Enable Email authentication in **Authentication → Providers**
4. (Optional) Adjust rate limits in **Authentication → Rate Limits**

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard pages
│   ├── dashboard/         # User dashboard pages
│   ├── pets/              # Public pet profile pages
│   └── ...
├── components/            # Reusable React components
├── contexts/              # React Context providers
├── lib/                   # Utility functions and configurations
│   ├── supabase.ts       # Supabase client
│   ├── i18n.ts           # Internationalization strings
│   ├── validation.ts     # Form validation utilities
│   └── errors.ts         # Error code handling
└── ...
supabase/
└── migrations/            # Database migration SQL files
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add your environment variables in Vercel's project settings
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Self-hosted with `npm run build && npm start`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
