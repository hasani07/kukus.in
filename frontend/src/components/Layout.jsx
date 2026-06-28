import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { logout } from "@/lib/auth";

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
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-[#FDFBF7]">
      {/* Sidebar */}
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#F4F1EA] border-r border-[#E5E2DC] transition-transform duration-200 ease-in-out flex flex-col`}
        data-testid="sidebar"
      >
        <div className="p-6 border-b border-[#E5E2DC]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="https://customer-assets.emergentagent.com/job_food-cost-tracker-22/artifacts/3t2znag2_ChatGPT%20Image%20Jun%2026%2C%202026%2C%2004_10_26%20PM.png" alt="Kukus.In" className="w-12 h-12 object-contain" data-testid="sidebar-logo" />
              <div>
                <h1 className="font-extrabold text-xl text-[#2D3A30] tracking-tight leading-none">Kukus<span className="text-[#D17B60]">.in</span></h1>
                <p className="text-[10px] text-[#6B756D] mt-0.5 tracking-wider uppercase">Finance Suite</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="lg:hidden p-2 text-[#6B756D]" data-testid="sidebar-close-btn">
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

        <div className="p-4 border-t border-[#E5E2DC] space-y-3">
          <div className="bg-white rounded-md p-3 border border-[#E5E2DC]">
            <p className="text-xs text-[#6B756D] leading-relaxed">
              <span className="font-semibold text-[#2D3A30]">Tips:</span> Atur fee ShopeeFood (~20%) & target margin di Pengaturan biar harga jual otomatis pas.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#6B756D] hover:text-[#D17B60] hover:bg-[#FAEDE9] rounded-md transition-colors"
          >
            <LogOut size={16} />
            Keluar
          </button>
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
