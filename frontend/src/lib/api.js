import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

// --- Simple TTL cache (60s) untuk semua GET request ---
const CACHE_TTL = 60_000;
const _cache = new Map();

function cacheGet(key, fetcher) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return Promise.resolve(hit.data);
  return fetcher().then((data) => {
    _cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

function bust(...keys) {
  keys.forEach((k) => _cache.delete(k));
}

// Ingredients
export const fetchIngredients = () => cacheGet("ingredients", () => api.get("/ingredients").then((r) => r.data));
export const createIngredient = (data) => api.post("/ingredients", data).then((r) => { bust("ingredients", "menus", "shopping-list"); return r.data; });
export const updateIngredient = (id, data) => api.put(`/ingredients/${id}`, data).then((r) => { bust("ingredients", "menus"); return r.data; });
export const deleteIngredient = (id) => api.delete(`/ingredients/${id}`).then((r) => { bust("ingredients", "menus", "shopping-list"); return r.data; });

// Packaging
export const fetchPackaging = () => cacheGet("packaging", () => api.get("/packaging").then((r) => r.data));
export const createPackaging = (data) => api.post("/packaging", data).then((r) => { bust("packaging", "menus"); return r.data; });
export const updatePackaging = (id, data) => api.put(`/packaging/${id}`, data).then((r) => { bust("packaging", "menus"); return r.data; });
export const deletePackaging = (id) => api.delete(`/packaging/${id}`).then((r) => { bust("packaging", "menus"); return r.data; });

// Menus
export const fetchMenus = () => cacheGet("menus", () => api.get("/menus").then((r) => r.data));
export const fetchMenu = (id) => api.get(`/menus/${id}`).then((r) => r.data);
export const createMenu = (data) => api.post("/menus", data).then((r) => { bust("menus", "dashboard"); return r.data; });
export const updateMenu = (id, data) => api.put(`/menus/${id}`, data).then((r) => { bust("menus", "dashboard"); return r.data; });
export const deleteMenu = (id) => api.delete(`/menus/${id}`).then((r) => { bust("menus", "dashboard"); return r.data; });
export const previewHpp = (data) => api.post("/menus/preview-hpp", data).then((r) => r.data);

// Sales
export const fetchSales = (params) => {
  const key = "sales:" + JSON.stringify(params || {});
  return cacheGet(key, () => api.get("/sales", { params }).then((r) => r.data));
};
export const createSale = (data) => api.post("/sales", data).then((r) => { bust("dashboard"); _cache.forEach((_, k) => k.startsWith("sales:") && _cache.delete(k)); return r.data; });
export const deleteSale = (id) => api.delete(`/sales/${id}`).then((r) => { bust("dashboard"); _cache.forEach((_, k) => k.startsWith("sales:") && _cache.delete(k)); return r.data; });

// Invoices
export const fetchInvoices = () => cacheGet("invoices", () => api.get("/invoices").then((r) => r.data));
export const fetchInvoice = (id) => api.get(`/invoices/${id}`).then((r) => r.data);
export const createInvoice = (data) => api.post("/invoices", data).then((r) => { bust("invoices", "dashboard"); return r.data; });
export const updateInvoiceStatus = (id, status) => api.put(`/invoices/${id}/status`, { status }).then((r) => { bust("invoices"); return r.data; });
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`).then((r) => { bust("invoices", "dashboard"); return r.data; });

// Settings
export const fetchSettings = () => cacheGet("settings", () => api.get("/settings").then((r) => r.data));
export const updateSettings = (data) => api.put("/settings", data).then((r) => { bust("settings"); return r.data; });

// Operating Costs
export const fetchOpCosts = () => cacheGet("operating-costs", () => api.get("/operating-costs").then((r) => r.data));
export const createOpCost = (data) => api.post("/operating-costs", data).then((r) => { bust("operating-costs", "dashboard"); return r.data; });
export const deleteOpCost = (id) => api.delete(`/operating-costs/${id}`).then((r) => { bust("operating-costs", "dashboard"); return r.data; });

// Purchases
export const fetchPurchases = () => cacheGet("purchases", () => api.get("/purchases").then((r) => r.data));
export const createPurchase = (data) => api.post("/purchases", data).then((r) => { bust("purchases", "shopping-list", "ingredients"); return r.data; });
export const deletePurchase = (id) => api.delete(`/purchases/${id}`).then((r) => { bust("purchases", "shopping-list", "ingredients"); return r.data; });

// Customers
export const fetchCustomers = () => cacheGet("customers", () => api.get("/customers").then((r) => r.data));
export const createCustomer = (data) => api.post("/customers", data).then((r) => { bust("customers"); return r.data; });
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data).then((r) => { bust("customers"); return r.data; });
export const deleteCustomer = (id) => api.delete(`/customers/${id}`).then((r) => { bust("customers"); return r.data; });

// Reports
export const fetchPnL = (month) => {
  const key = "pnl:" + (month || "");
  return cacheGet(key, () => api.get("/reports/pnl", { params: { month } }).then((r) => r.data));
};
export const fetchBreakEven = (fixed_cost, menu_id) => api.get("/reports/break-even", { params: { fixed_cost, menu_id } }).then((r) => r.data);
export const fetchPromoRoi = (menu_id, discount_pct) => api.get("/reports/promo-roi", { params: { menu_id, discount_pct } }).then((r) => r.data);
export const fetchShoppingList = () => cacheGet("shopping-list", () => api.get("/shopping-list").then((r) => r.data));

// Dashboard
export const fetchDashboard = (period = "30d") => {
  const key = "dashboard:" + period;
  return cacheGet(key, () => api.get("/dashboard/stats", { params: { period } }).then((r) => r.data));
};
