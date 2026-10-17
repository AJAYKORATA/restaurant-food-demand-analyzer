# Restaurant Food Demand Analyzer

A full-stack restaurant management application with real-time order tracking, analytics dashboards, daily reports, and food preparation planning.

## Features

- **Dashboard** — Live stats (today's revenue, active orders, total revenue), 7-day revenue chart, and top-selling dishes chart
- **Orders** — Full CRUD: create, edit, delete, and filter orders by status; search by order number, table, or dish name
- **Analytics** — Popular dishes ranking, peak demand by hour, category revenue pie chart, 14-day revenue/order trends, category performance table
- **Menu Management** — Add, edit, deactivate dishes organized by category with color-coded cards
- **Daily Report** — Date-selectable report with hourly order volume, status breakdown, per-dish revenue percentages, and full order log
- **Food Prep Planning** — Aggregated prep requirements grouped by category, with quantities, per-unit and total prep times, priority labels, and visual prep load chart

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Recharts, React Router, Lucide Icons
- **Backend/Database:** Supabase (PostgreSQL) — orders, dishes, and categories tables with Row Level Security

## Getting Started

```bash
npm install
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

## Database Schema

- **categories** — Dish categories (Appetizers, Mains, Seafood, etc.) with color coding
- **dishes** — Menu items with price, prep time, category, and active status
- **orders** — Customer orders with line items stored as JSONB, status tracking, and timestamps

## Environment Variables

The app requires Supabase credentials (pre-configured in the Bolt environment). For local development, create a `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## License

MIT
