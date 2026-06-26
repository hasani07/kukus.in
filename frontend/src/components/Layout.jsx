import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Carrot,
  Package,
  UtensilsCrossed,
  ShoppingBag,
  FileText,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  X,
  Wallet,
  ShoppingCart,
  Users,
  LineChart,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { to: "/bahan-baku", label: "Bahan Baku", icon: Carrot, testId: "nav-ingredients" },
  { to: "/packaging", label: "Packaging", icon: Package, testId: "nav-packaging" },
  { to: "/menu", label: "Menu & HPP", icon: UtensilsCrossed, testId: "nav-menus" },
  { to: "/penjualan", label: "Penjualan", icon: ShoppingBag, testId: "nav-sales" },
  { to: "/belanja", label: "Belanja & Restock", icon: ShoppingCart, testId: "nav-purchases" },
  { to: "/biaya-operasional", label: "Biaya Operasional", icon: Wallet, testId: "nav-opcosts" },
  { to: "/customer", label: "Customer", icon: Users, testId: "nav-customers" },
  { to: "/laporan", label: "Laporan & Analisis", icon: LineChart, testId: "nav-reports" },
  { to: "/invoice", label: "Invoice", icon: FileText, testId: "nav-invoices" },
  { to: "/pengaturan", label: "Pengaturan", icon: SettingsIcon, testId: "nav-settings" },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-[#FDFBF7]">
      {/* Sidebar */}
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#F4F1EA] border-r border-[#E5E2DC] transition-transform duration-200 ease-in-out flex flex-col`}
        data-testid="sidebar"
      >
        <div className="p-6 border-b border-[#E5E2DC]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-extrabold text-2xl text-[#2D3A30] tracking-tight">Kukus<span className="text-[#D17B60]">.In</span></h1>
              <p className="text-xs text-[#6B756D] mt-0.5 tracking-wider uppercase">Finance Suite</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden p-2 text-[#6B756D]"
              data-testid="sidebar-close-btn"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || (item.to === "/dashboard" && location.pathname === "/");
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                data-testid={item.testId}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#4A6750] text-white shadow-sm"
                    : "text-[#2D3A30] hover:bg-[#E9EFEA]"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E5E2DC]">
          <div className="bg-white rounded-md p-3 border border-[#E5E2DC]">
            <p className="text-xs text-[#6B756D] leading-relaxed">
              <span className="font-semibold text-[#2D3A30]">Tips:</span> Atur fee ShopeeFood (~20%) & target margin di Pengaturan biar harga jual otomatis pas.
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && <div className="lg:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setOpen(false)} />}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-[#E5E2DC] px-4 py-3 flex items-center justify-between">
          <button onClick={() => setOpen(true)} data-testid="sidebar-open-btn">
            <MenuIcon size={22} className="text-[#2D3A30]" />
          </button>
          <h2 className="font-bold text-[#2D3A30]">Kukus.In</h2>
          <div className="w-6" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
