import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

// Ingredients
export const fetchIngredients = () => api.get("/ingredients").then((r) => r.data);
export const createIngredient = (data) => api.post("/ingredients", data).then((r) => r.data);
export const updateIngredient = (id, data) => api.put(`/ingredients/${id}`, data).then((r) => r.data);
export const deleteIngredient = (id) => api.delete(`/ingredients/${id}`).then((r) => r.data);

// Packaging
export const fetchPackaging = () => api.get("/packaging").then((r) => r.data);
export const createPackaging = (data) => api.post("/packaging", data).then((r) => r.data);
export const updatePackaging = (id, data) => api.put(`/packaging/${id}`, data).then((r) => r.data);
export const deletePackaging = (id) => api.delete(`/packaging/${id}`).then((r) => r.data);

// Menus
export const fetchMenus = () => api.get("/menus").then((r) => r.data);
export const fetchMenu = (id) => api.get(`/menus/${id}`).then((r) => r.data);
export const createMenu = (data) => api.post("/menus", data).then((r) => r.data);
export const updateMenu = (id, data) => api.put(`/menus/${id}`, data).then((r) => r.data);
export const deleteMenu = (id) => api.delete(`/menus/${id}`).then((r) => r.data);
export const previewHpp = (data) => api.post("/menus/preview-hpp", data).then((r) => r.data);

// Sales
export const fetchSales = (params) => api.get("/sales", { params }).then((r) => r.data);
export const createSale = (data) => api.post("/sales", data).then((r) => r.data);
export const deleteSale = (id) => api.delete(`/sales/${id}`).then((r) => r.data);

// Invoices
export const fetchInvoices = () => api.get("/invoices").then((r) => r.data);
export const fetchInvoice = (id) => api.get(`/invoices/${id}`).then((r) => r.data);
export const createInvoice = (data) => api.post("/invoices", data).then((r) => r.data);
export const updateInvoiceStatus = (id, status) => api.put(`/invoices/${id}/status`, { status }).then((r) => r.data);
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`).then((r) => r.data);

// Settings
export const fetchSettings = () => api.get("/settings").then((r) => r.data);
export const updateSettings = (data) => api.put("/settings", data).then((r) => r.data);

// Dashboard
export const fetchDashboard = (period = "30d") => api.get("/dashboard/stats", { params: { period } }).then((r) => r.data);
