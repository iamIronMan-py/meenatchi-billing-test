# Meenatchi Footwear Billing — Session Summary

## What Was Built
Complete text-based billing application for "Meenatchi Footwear" shoe mart.

## Tech Stack
- React 18 + Vite
- localStorage (SQLite-style mock)
- No external UI framework — custom gold/brown/white theme
- XLSX export, HID barcode scanner support

## Features Implemented

### Billing Page (Alt+B)
- HID barcode scanner (USB keyboard wedge) — scan or type name/size/barcode
- Discount before GST (Master sets daily, cashier can override)
- SGST/CGST split per item
- Payment methods: Cash / UPI (Txn ID) / Card (last 4 digits)
- Customer Phone + Name + Loyalty Points (1 pt / ₹100)
- Invoice: Small Paper (80mm thermal) or A4 Sheet — default A4
- Paginated invoice preview (8 items/page), full print via `print-only`
- **Draft Billing (Hold/Recall)**:
  - F5 — Hold current billing as draft
  - F6 — Recall last held draft
  - F7 — Toggle drafts panel (slide-in from right)
  - Drafts panel shows timestamp, items, total, customer, Recall/Delete buttons

### Master Page (Alt+M)
- Products: CRUD, Type filter (Mens/Women/Kids), search, pagination (8/page)
- Excel Import/Export, duplicate check (name+brand+size)
- Discounts: Create daily discounts, "Set as Today", cashier override at billing

### History Page (Alt+H)
- Date range / Payment / Phone filters, quick ranges (This Month, Last Month, This Year)
- Pagination (7/page), Reprint button (opens formatted invoice in new window)
- **Excel Export**: 3 sheets (Summary / Invoices / Line Items) for GST audit
- **PDF Export**: A4 landscape print-ready HTML with shop header, GST summary boxes, invoice-wise table, line items detail

### Analytics Page (Alt+A)
- 5 tabs: Overview / By Type / By Payment / Time-wise / Bills
- Charts: Bar + Line + Pie combinations
- Line chart with x-axis labels (smart skip for 14-day data) + color legend
- KPI cards: Highest Day, Total Gross, Cash In, Balance Out
- Type/Payment filters, Excel export

### Help Page (Alt+? / F1)
- All shortcuts reference, Tips section

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Alt+B/M/H/A | Navigate to Billing/Master/History/Analytics |
| Alt+? / F1 | Help |
| F2 | Focus scan/search box |
| F4 / Ctrl+Enter | Checkout & Print |
| F5 | Hold billing (save as draft) |
| F6 | Recall last draft |
| F7 | Toggle drafts panel |
| Esc | Clear search / Close modal |
| Tab / Shift+Tab | Move between fields |

## Theme
- Gold `#B9972E` + Dark Brown `#3E2723` + White/Cream `#FFFBF5/#FFF8EE`
- Logo: `public/logo.jpeg`
- No dark mode

## Pagination (.env)
```
VITE_PAGINATION_MASTER=8
VITE_PAGINATION_HISTORY=7
VITE_PAGINATION_ANALYTICS=7
VITE_PAGINATION_BILLING=8
```

## Build & Run
```bash
npm install
npm run dev       # development
npm run build     # production → dist/
```

## File Structure
```
src/
  App.jsx              — Routing, global shortcuts, seeding
  index.css            — Theme, layout classes, print styles
  main.jsx             — Entry point
  components/
    Sidebar.jsx        — 190px vertical nav with logo
  pages/
    Billing.jsx        — Text billing, drafts, invoice preview
    Master.jsx         — Product/Discount CRUD, Excel import
    History.jsx        — Invoice list, filters, PDF/Excel export
    Analytics.jsx      — Charts (Bar/Line/Pie), KPIs, bills table
    Help.jsx           — Shortcuts reference
  services/
    db.js              — localStorage CRUD, drafts, customers, seeding
    mockData.js        — 16 products, 6 customers, 40 invoices
  assets/
    logo.jpeg          — Shop logo
```

## Deployment
- Vercel/Netlify: Point to repo, auto-detects Vite
- GitHub: https://github.com/iamIronMan-py/meenatchi-billing-test
