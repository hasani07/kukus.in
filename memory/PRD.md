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

## Changelog — 2026-06-29
- ✅ Fix: invoice number collision → atomic counter di collection `counters`
- ✅ Fix: platform fee di sales pakai channel fee dari Settings (bukan legacy `platform_fee_pct` di menu)
- ✅ Fix: create_sale batch-fetch (N+1 → 4 query paralel)
- ✅ Fix: delete_purchase recalculate MAC dari sisa pembelian
- ✅ Add: PUT /operating-costs/{cid} endpoint
- ✅ Add: Edit biaya operasional di UI (Pencil button)
- ✅ Add: Expiry date field di form bahan baku + kolom tabel + badge alert
- ✅ Add: CSV export P&L di halaman Laporan
- ✅ Fix: warmup di App.js tidak lagi load fetchMenus (berat karena compute HPP semua menu)

## Backlog
- P1: CSV/Excel export Bahan Baku & Pembelian
- P2: Shopping list auto-generate dari forecast
- P2: Multi-outlet, sales forecast AI
