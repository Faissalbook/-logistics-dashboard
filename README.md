# BudgetFlow 50/30/20

A modern, mobile-first personal budget tracker built on the **50/30/20 rule**:
50% of net income for **Needs**, 30% for **Wants**, 20% for **Savings & debt repayment**.

## Features

- 💰 **Guided setup** — name, currency (GNF, USD, EUR, GBP, CAD or custom), monthly net income, budget month, customizable percentages (validated to total 100%)
- 📊 **Dashboard** — income, total spent, remaining balance, total saved, budget usage, month selector, and three budget cards (budgeted / spent / remaining) with progress bars, status colors and overspending warnings
- 🧾 **Transactions** — add, edit, delete (with confirmation), search & filter; date, description, amount, budget group, subcategory, payment method, note, and a recurring toggle that auto-fills each new month
- 📈 **Charts & insights** — spending doughnut, budget-vs-actual bars, monthly trend, savings progress, top-5 categories, and plain-language insights ("You have used 82% of your Wants budget")
- 🎯 **Savings goals** — target amount, target date, monthly contribution, progress bars; contributions are recorded as Savings/Debt transactions
- 📑 **Reports** — monthly & yearly summaries, best/worst category, CSV and PDF export
- 🌍 **Languages** — English, French, and Arabic with a full right-to-left layout
- 🌙 **Light & dark modes**, responsive from phone (bottom nav) to desktop (collapsible sidebar)
- 🔐 **Local accounts** — email + password sign-in; each user's data is stored separately and persists across refreshes

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build:

```bash
npm run build      # outputs to dist/
npm run preview
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| UI | React 18, Vite, Tailwind CSS |
| State | Zustand (persisted to localStorage per user) |
| Routing | React Router v6 |
| Charts | Recharts |
| Icons | lucide-react |
| Export | jsPDF + autotable (PDF), Blob download (CSV) |

## Data & security notes

This app is **local-first**: there is no backend, so all data lives in the
browser's localStorage, namespaced per account (`bf.data.<userId>`). Passwords
are salted and hashed (SHA-256 via Web Crypto) before storage, and each signed-in
user only sees their own data. This is demo-grade authentication — suitable for a
personal device, not a substitute for a real server with proper auth.

Currency formatting follows the selected currency: GNF and custom codes render as
whole numbers with thousands separators (e.g. `3,500,000 GNF`); USD/EUR/GBP/CAD use
native locale currency formatting.

Note: PDF exports fall back to English labels when the UI language is Arabic,
because jsPDF's built-in fonts cannot shape Arabic script. CSV exports keep the
selected language.
