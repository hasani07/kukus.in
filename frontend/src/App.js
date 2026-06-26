import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Ingredients from "@/pages/Ingredients";
import Packaging from "@/pages/Packaging";
import Menus from "@/pages/Menus";
import Sales from "@/pages/Sales";
import Invoices from "@/pages/Invoices";
import InvoicePrint from "@/pages/InvoicePrint";
import SettingsPage from "@/pages/SettingsPage";
import OperatingCosts from "@/pages/OperatingCosts";
import Purchases from "@/pages/Purchases";
import Customers from "@/pages/Customers";
import Reports from "@/pages/Reports";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/invoice/:id/print" element={<InvoicePrint />} />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bahan-baku" element={<Ingredients />} />
            <Route path="/packaging" element={<Packaging />} />
            <Route path="/menu" element={<Menus />} />
            <Route path="/penjualan" element={<Sales />} />
            <Route path="/belanja" element={<Purchases />} />
            <Route path="/biaya-operasional" element={<OperatingCosts />} />
            <Route path="/customer" element={<Customers />} />
            <Route path="/laporan" element={<Reports />} />
            <Route path="/invoice" element={<Invoices />} />
            <Route path="/pengaturan" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
