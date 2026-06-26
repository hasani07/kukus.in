# Kukus.In Financial Management - PRD

## Original Problem Statement
User just registered ShopeeFood merchant "Kukus.In" (healthy steamed food). Needs full financial management: ingredient cost, packaging cost, HPP calculator, selling price recommendation, stock tracking, sales recording (monthly), invoice generation.

## User Choices
- No authentication (single-user)
- IDR + Bahasa Indonesia
- Both customer invoice + monthly reports
- No AI integration

## Architecture
- Backend: FastAPI + MongoDB (6 collections: ingredients, packaging, menus, sales, invoices, settings)
- Frontend: React + Shadcn + Tailwind + Recharts
- Theme: Organic & Earthy (sage green #4A6750 + terracotta #D17B60) with Manrope/IBM Plex Sans fonts

## Implemented (Phase 1 — Feb 2026)
- ✅ Bahan Baku CRUD with low-stock alerts (price/unit, stock, threshold)
- ✅ Packaging CRUD with low-stock alerts
- ✅ Menu/Recipe builder with auto HPP calculator (ingredients + packaging + labor + overhead)
- ✅ Live recommended-price calculator: price = HPP / ((1-margin)*(1-fee)), rounded ↑ 500
- ✅ Sales recording with auto stock deduction; platform fee + profit auto-computed; supports ShopeeFood/GoFood/GrabFood/Dine-In/Cash channels
- ✅ Sales deletion restores stock back
- ✅ Invoice generation with auto-numbered INV-YYYYMM-NNNN, printable PDF view (/invoice/:id/print)
- ✅ Invoice status workflow (unpaid/paid/cancelled)
- ✅ Settings: business info + default margin/fee
- ✅ Dashboard: revenue, profit, margin %, items sold, daily trend, top 5 best sellers, channel breakdown, low-stock alerts
- ✅ Mobile-responsive sidebar nav

## Backlog (Future Iterations)
- P1: CSV/Excel export sales, recap PDF bulanan, multi-platform fee profile (per channel auto)
- P1: Stock movement history (manual adjustment, restocking ingredient with cost averaging)
- P2: Customer database (recurring customers for catering)
- P2: Recipe scaling helper (yield per resep > 1 porsi)
- P2: Cash flow tracker (expenses non-bahan: sewa, marketing, dll)
- P2: Multi-outlet support
