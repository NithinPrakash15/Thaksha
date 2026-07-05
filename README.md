# Thaksha Commerce

Premium e-commerce storefront built with TanStack Start, React, TypeScript, Tailwind CSS, and a deployment-ready commerce architecture.

## Current Production Scope

- Luxury responsive storefront
- Product catalog, product detail pages, search, wishlist, persistent cart
- Checkout flow with order confirmation in sandbox/manual payment mode
- Account and admin dashboard foundations
- SEO metadata, sitemap route, robots.txt
- Prisma PostgreSQL schema for users, products, orders, payments, reviews, wishlist, sessions
- Dockerfile and environment template

## Local Setup

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Environment

Copy `.env.example` to `.env` and fill production values before going live.

Required for database-backed production:

- `DATABASE_URL`
- `SESSION_SECRET`
- Cloudinary keys for product image upload
- Stripe, Razorpay, or PayPal keys before accepting real payments

## Deployment

This Lovable/TanStack Start project currently builds a Nitro output. You can deploy the generated `.output` to a Node/Nitro-compatible host or adapt the Nitro preset for Cloudflare.

Recommended production stack:

- Frontend/server: Vercel, Render, Railway, or Cloudflare Workers after preset verification
- Database: Supabase Postgres, Neon, Railway Postgres, or Render Postgres
- Images: Cloudinary
- Payments: Stripe first, then Razorpay/PayPal adapters

## Important Launch Checklist

- Connect Prisma client and run migrations against production Postgres
- Replace sandbox/manual checkout with payment intents
- Add secure server-side auth with hashed passwords and httpOnly cookies
- Add real admin authorization before exposing write actions
- Configure domain, canonical URL, Open Graph image, analytics, email provider, and error monitoring
