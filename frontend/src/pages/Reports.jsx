import { useEffect, useState } from "react";
import { fetchPnL, fetchBreakEven, fetchPromoRoi, fetchMenus } from "@/lib/api";
import { formatIDR, formatNumber } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Calculator, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [menus, setMenus] = useState([]);
  useEffect(() => { fetchMenus().then(setMenus); }, []);
  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader testId="reports-page" title="Laporan & Analisis" subtitle="Laba-rugi real, kalkulator break-even, dan promo ROI — semua tools strategis di satu tempat." />

      <Tabs defaultValue="pnl">
        <TabsList className="bg-[#F4F1EA] mb-6">
          <TabsTrigger value="pnl" data-testid="tab-pnl"><TrendingUp size={14} className="mr-2" /> P&L Bulanan</TabsTrigger>
          <TabsTrigger value="be" data-testid="tab-breakeven"><Calculator size={14} className="mr-2" /> Break-Even</TabsTrigger>
          <TabsTrigger value="promo" data-testid="tab-promo"><Sparkles size={14} className="mr-2" /> Promo ROI</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl"><PnLTab defaultMonth={thisMonth} /></TabsContent>
        <TabsContent value="be"><BreakEvenTab menus={menus} /></TabsContent>
        <TabsContent value="promo"><PromoTab menus={menus} /></TabsContent>
      </Tabs>
    </div>
  );
}

function PnLTab({ defaultMonth }) {
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState(null);

  useEffect(() => { fetchPnL(month).then(setData).catch(() => {}); }, [month]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label className="text-sm">Bulan:</Label>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48" data-testid="pnl-month-input" />
      </div>

      {data && (
        <Card className="border-[#E5E2DC] pnl-printable"><CardContent className="p-8">
          <div className="flex justify-between items-start mb-6 no-print">
            <h3 className="font-bold text-xl text-[#2D3A30]">Laporan Laba-Rugi {month}</h3>
            <Button size="sm" variant="outline" onClick={() => window.print()} data-testid="print-pnl-btn">🖨️ Print / Save PDF</Button>
          </div>
          <h3 className="font-bold text-xl text-[#2D3A30] mb-6 print-only">Kukus.In · Laporan Laba-Rugi {month}</h3>
          <div className="space-y-3 max-w-2xl">
            <Row label="Pendapatan (Revenue)" value={data.revenue} positive />
            <Row label="HPP (Cost of Goods Sold)" value={-data.cogs} />
            <Row label="LABA KOTOR (Gross Profit)" value={data.gross_profit} bold border />
            <p className="text-xs text-[#6B756D] -mt-1">Margin Kotor: {(data.gross_margin_pct ?? 0).toFixed(1)}%</p>

            <div className="pt-4 mt-4 border-t border-[#E5E2DC]">
              <p className="text-xs uppercase tracking-wider text-[#A1A8A3] mb-2">Biaya Operasional</p>
              {data.operating_costs_by_category.length === 0 ? (
                <p className="text-sm text-[#6B756D] italic">Belum ada biaya operasional dicatat untuk bulan ini.</p>
              ) : data.operating_costs_by_category.map((c) => (
                <Row key={c.category} label={c.category} value={-c.amount} small />
              ))}
              <Row label="Total Biaya Operasional" value={-data.operating_costs_total} bold />
            </div>

            <div className="pt-4 mt-4 border-t-2 border-[#2D3A30]">
              <Row label="LABA BERSIH (Net Profit)" value={data.net_profit} bold xl positive={data.net_profit > 0} negative={data.net_profit < 0} />
              <p className="text-sm text-[#6B756D] mt-1">Net Margin: <span className={data.net_margin_pct > 0 ? "text-[#4A6750] font-bold" : "text-[#D17B60] font-bold"}>{(data.net_margin_pct ?? 0).toFixed(1)}%</span> · {data.total_orders} order</p>
            </div>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

function Row({ label, value, bold, xl, positive, negative, border, small }) {
  return (
    <div className={`flex justify-between items-center ${border ? "pt-2 border-t border-[#E5E2DC]" : ""} ${small ? "text-sm" : ""}`}>
      <span className={`${bold ? "font-bold text-[#2D3A30]" : "text-[#6B756D]"} ${xl ? "text-lg" : ""} capitalize`}>{label}</span>
      <span className={`${bold ? "font-extrabold" : "font-medium"} ${xl ? "text-2xl" : ""} ${positive ? "text-[#4A6750]" : negative ? "text-[#D17B60]" : "text-[#2D3A30]"}`}>{formatIDR(value)}</span>
    </div>
  );
}

function BreakEvenTab({ menus }) {
  const [fixedCost, setFixedCost] = useState(5000000);
  const [menuId, setMenuId] = useState("");
  const [result, setResult] = useState(null);

  const calc = async () => {
    try {
      const id = menuId && menuId !== "__all__" ? menuId : undefined;
      const r = await fetchBreakEven(Number(fixedCost), id);
      setResult(r);
    } catch { toast.error("Gagal hitung"); }
  };

  return (
    <Card className="border-[#E5E2DC]"><CardContent className="p-8 max-w-2xl">
      <h3 className="font-bold text-xl text-[#2D3A30] mb-2">Break-Even Calculator</h3>
      <p className="text-sm text-[#6B756D] mb-6">Berapa porsi minimum harus terjual supaya balik modal?</p>
      <div className="space-y-4">
        <div>
          <Label>Total Fixed Cost / Bulan (sewa + gaji + dll)</Label>
          <Input type="number" value={fixedCost} onChange={(e) => setFixedCost(e.target.value)} data-testid="be-fixed-input" />
        </div>
        <div>
          <Label>Berdasarkan Menu (opsional)</Label>
          <Select value={menuId} onValueChange={setMenuId}>
            <SelectTrigger data-testid="be-menu-select"><SelectValue placeholder="Pakai rata-rata penjualan 30 hari" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Rata-rata semua menu</SelectItem>
              {menus.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={calc} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="be-calc-btn">Hitung</Button>

        {result && !result.error && (
          <div className="mt-6 p-6 bg-[#E9EFEA] rounded-lg space-y-2">
            <p className="text-sm text-[#6B756D]">Profit per porsi: <span className="font-bold text-[#2D3A30]">{formatIDR(result.profit_per_unit)}</span></p>
            <p className="text-3xl font-extrabold text-[#4A6750]">{formatNumber(result.porsi_per_bulan, 0)} <span className="text-lg font-normal text-[#6B756D]">porsi / bulan</span></p>
            <p className="text-lg font-bold text-[#2D3A30]">≈ {formatNumber(result.porsi_per_hari, 0)} porsi / hari</p>
            <p className="text-sm text-[#6B756D]">Target Pendapatan: {formatIDR(result.revenue_target_per_bulan)}/bulan</p>
          </div>
        )}
        {result?.error && <p className="text-sm text-[#D17B60]">{result.error}</p>}
      </div>
    </CardContent></Card>
  );
}

function PromoTab({ menus }) {
  const [menuId, setMenuId] = useState("");
  const [disc, setDisc] = useState(20);
  const [result, setResult] = useState(null);

  const calc = async () => {
    if (!menuId) { toast.error("Pilih menu"); return; }
    try {
      const r = await fetchPromoRoi(menuId, Number(disc));
      setResult(r);
    } catch { toast.error("Gagal hitung"); }
  };

  return (
    <Card className="border-[#E5E2DC]"><CardContent className="p-8 max-w-2xl">
      <h3 className="font-bold text-xl text-[#2D3A30] mb-2">Promo ROI Calculator</h3>
      <p className="text-sm text-[#6B756D] mb-6">Hitung impact diskon: berapa porsi extra harus terjual supaya promo tetap untung?</p>
      <div className="space-y-4">
        <div>
          <Label>Pilih Menu</Label>
          <Select value={menuId} onValueChange={setMenuId}>
            <SelectTrigger data-testid="promo-menu-select"><SelectValue placeholder="Pilih..." /></SelectTrigger>
            <SelectContent>{menus.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Diskon (%)</Label>
          <Input type="number" value={disc} onChange={(e) => setDisc(e.target.value)} data-testid="promo-disc-input" />
        </div>
        <Button onClick={calc} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="promo-calc-btn">Hitung ROI</Button>

        {result && (
          <div className="mt-6 p-6 bg-[#F4F1EA] rounded-lg space-y-3">
            <h4 className="font-bold text-[#2D3A30]">{result.menu_name}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-[#6B756D]">Harga Normal</p><p className="font-bold text-[#2D3A30]">{formatIDR(result.normal_price)}</p><p className="text-xs text-[#4A6750]">Profit: {formatIDR(result.normal_profit_per_unit)}/pcs</p></div>
              <div><p className="text-xs text-[#6B756D]">Harga Promo (-{result.discount_pct}%)</p><p className="font-bold text-[#D17B60]">{formatIDR(result.promo_price)}</p><p className="text-xs text-[#D17B60]">Profit: {formatIDR(result.promo_profit_per_unit)}/pcs</p></div>
            </div>
            {result.warning ? (
              <div className="p-3 bg-[#FAEDE9] rounded-md border border-[#D17B60]">
                <p className="text-sm font-semibold text-[#D17B60]">{result.warning}</p>
              </div>
            ) : (
              <div className="p-3 bg-[#E9EFEA] rounded-md border border-[#4A6750]">
                <p className="text-sm text-[#2D3A30]">Supaya promo tetap untung sama seperti tanpa promo, harus jual <span className="font-bold text-[#4A6750]">{(result.extra_volume_multiplier ?? 0).toFixed(2)}x</span> lebih banyak.</p>
                <p className="text-xs text-[#6B756D] mt-1">Contoh: kalau normal jual 10 porsi → harus laku {Math.ceil(10 * result.extra_volume_multiplier)} porsi saat promo.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </CardContent></Card>
  );
}
