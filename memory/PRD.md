# Kukus.In Financial Management - PRD

## Original Problem Statement
ShopeeFood merchant "Kukus.In" (healthy steamed food). Full financial management: ingredient cost, packaging, HPP, selling price, stock, sales recording, invoice generation.

## User Choices
- No auth (single-user), IDR + Bahasa Indonesia, both invoice + reports, no AI

## Architecture
- Backend: FastAPI + MongoDB (10 collections: ingredients, packaging, menus, sales, invoices, settings, operating_costs, purchases, customers)
- Frontend: React + Shadcn + Tailwind + Recharts; theme Organic Earthy (sage + terracotta)

## Implemented (Phase 1+2 — Feb 2026)
### Phase 1 (MVP)
- ✅ Bahan Baku, Packaging, Menu/HPP, Penjualan, Invoice, Dashboard, Settings

### Phase 2 (Expansion)
- ✅ Recipe Yield: 1 batch → N porsi, bahan & labor auto dibagi
- ✅ Psychological price suggestions (3 variants ending 500/900/099)
- ✅ Biaya Operasional (rent, utility, salary, marketing, dll) with monthly summary
- ✅ Belanja & Restock dengan Moving Average Cost (HPP auto-update)
- ✅ Customer CRM (regular/catering/corporate) + WhatsApp link generator
- ✅ Laporan & Analisis: P&L Bulanan REAL (revenue - cogs - opcosts = net profit), Break-Even Calculator, Promo ROI Calculator
- ✅ WhatsApp order form generator (bypass fee 20%)

## Backlog
- P1: Expiry tracking UI for ingredients (backend supports expiry_date)
- P1: CSV/Excel export, monthly recap PDF
- P2: Shopping list auto-generate dari forecast
- P2: Multi-outlet, sales forecast AI
