import { useEffect, useState } from "react";
import { fetchSales, fetchMenus, createSale, deleteSale } from "@/lib/api";
import { formatIDR, formatDate, todayISO, channelLabel } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ShoppingBag, X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const channels = [
  { v: "shopeefood", label: "ShopeeFood" },
  { v: "gofood", label: "GoFood" },
  { v: "grabfood", label: "GrabFood" },
  { v: "dine-in", label: "Dine-In" },
  { v: "cash", label: "Cash" },
  { v: "other", label: "Lainnya" },
];

const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function monthLabel(ym) {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}
function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const exportCSV = (sales, label) => {
  if (sales.length === 0) { toast.error("Belum ada data penjualan"); return; }
  const rows = [["Tanggal", "Channel", "Items", "Qty", "Subtotal", "Platform Fee", "Diskon", "Net Total", "HPP", "Profit", "Catatan"]];
  sales.forEach((s) => {
    const itemsStr = s.items.map((i) => `${i.menu_name} x${i.qty}`).join(" | ");
    const totalQty = s.items.reduce((a, b) => a + b.qty, 0);
    rows.push([s.date, s.channel, itemsStr, totalQty, s.subtotal, s.platform_fee, s.discount, s.total, s.total_hpp, s.profit, s.notes || ""]);
  });
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `kukus-in-penjualan-${label}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV berhasil diunduh");
};

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [menus, setMenus] = useState([]);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [form, setForm] = useState({ date: todayISO(), channel: "shopeefood", items: [], discount: 0, notes: "" });

  const load = async () => {
    const [s, m] = await Promise.all([fetchSales(), fetchMenus()]);
    setSales(s); setMenus(m);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ date: todayISO(), channel: "shopeefood", items: [], discount: 0, notes: "" });
    setOpen(true);
  };

  const addItem = () => {
    if (menus.length === 0) { toast.error("Tambah menu dulu"); return; }
    const m = menus[0];
    setForm({ ...form, items: [...form.items, { menu_id: m.id, menu_name: m.name, qty: 1, price: m.computed?.selling_price || 0 }] });
  };

  const save = async () => {
    if (form.items.length === 0) { toast.error("Tambahkan minimal 1 item"); return; }
    try {
      await createSale({
        date: form.date, channel: form.channel,
        items: form.items.map((it) => ({ menu_id: it.menu_id, menu_name: it.menu_name, qty: Number(it.qty), price: Number(it.price) })),
        discount: Number(form.discount) || 0,
        notes: form.notes || null,
      });
      toast.success("Penjualan dicatat & stok terpotong");
      setOpen(false); load();
    } catch (e) { toast.error("Gagal menyimpan"); }
  };

  const remove = async (id) => {
    if (!confirm("Hapus transaksi ini? Stock akan dikembalikan.")) return;
    await deleteSale(id); toast.success("Dihapus"); load();
  };

  const thisMonthISO = todayISO().slice(0, 7);
  const canNext = month < thisMonthISO;
  const filtered = sales.filter((s) => s.date.startsWith(month));
  const totalNet = filtered.reduce((s, i) => s + i.total, 0);
  const totalProfit = filtered.reduce((s, i) => s + i.profit, 0);
  const totalHpp = filtered.reduce((s, i) => s + i.total_hpp, 0);
  const subtotal = form.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader
        title="Penjualan"
        subtitle="Catat setiap order. Stok bahan & packaging terpotong otomatis sesuai resep."
        testId="sales-page"
        action={
          <div className="flex gap-2">
            <Button onClick={() => exportCSV(filtered, month)} variant="outline" className="border-[#4A6750] text-[#4A6750]" data-testid="export-csv-btn">
              <Download size={14} className="mr-2" /> Export CSV
            </Button>
            <Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="add-sale-btn">
              <Plus size={16} className="mr-2" /> Catat Penjualan
            </Button>
          </div>
        }
      />

      {/* Month Picker */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, -1))} className="px-2"><ChevronLeft size={16} /></Button>
        <span className="font-semibold text-[#2D3A30] min-w-[150px] text-center">{monthLabel(month)}</span>
        <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, 1))} disabled={!canNext} className="px-2"><ChevronRight size={16} /></Button>
        {month !== thisMonthISO && (
          <Button variant="ghost" size="sm" onClick={() => setMonth(thisMonthISO)} className="text-xs text-[#4A6750]">Bulan Ini</Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="border-[#E5E2DC]"><CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-[#A1A8A3] mb-1">Transaksi</p>
          <p className="text-2xl font-extrabold text-[#2D3A30]">{filtered.length}</p>
        </CardContent></Card>
        <Card className="border-[#E5E2DC]"><CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-[#A1A8A3] mb-1">Net Penjualan</p>
          <p className="text-2xl font-extrabold text-[#2D3A30]">{formatIDR(totalNet)}</p>
        </CardContent></Card>
        <Card className="border-[#E5E2DC]"><CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-[#A1A8A3] mb-1">Total HPP</p>
          <p className="text-2xl font-extrabold text-[#D17B60]">{formatIDR(totalHpp)}</p>
        </CardContent></Card>
        <Card className="border-[#E5E2DC]"><CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-[#A1A8A3] mb-1">Profit Kotor</p>
          <p className="text-2xl font-extrabold text-[#4A6750]">{formatIDR(totalProfit)}</p>
          {totalNet > 0 && <p className="text-xs text-[#6B756D]">{(totalProfit / totalNet * 100).toFixed(1)}% margin</p>}
        </CardContent></Card>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingBag} title={`Belum ada transaksi di ${monthLabel(month)}`}
          description="Setiap penjualan dicatat di sini. Sistem otomatis menghitung profit & memotong stock."
          action={<Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="empty-add-sale-btn">Catat Penjualan</Button>} />
      ) : (
        <Card className="border-[#E5E2DC] overflow-hidden"><CardContent className="p-0">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-[#F4F1EA] text-[#2D3A30]">
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Tanggal</th>
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Channel</th>
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Items</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Subtotal</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Fee/Disc</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Net</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Profit</th>
              <th className="text-right py-3 px-4 w-12"></th>
            </tr></thead>
            <tbody>{filtered.map((s) => (
              <tr key={s.id} className="border-b border-[#E5E2DC] hover:bg-[#FDFBF7]" data-testid={`sale-row-${s.id}`}>
                <td className="py-3 px-4 text-[#2D3A30]">{formatDate(s.date)}</td>
                <td className="py-3 px-4"><Badge variant="outline" className="border-[#E5E2DC] text-[#2D3A30]">{channelLabel(s.channel)}</Badge></td>
                <td className="py-3 px-4 text-[#6B756D]">{s.items.map((i) => `${i.menu_name} ×${i.qty}`).join(", ")}</td>
                <td className="py-3 px-4 text-right text-[#2D3A30]">{formatIDR(s.subtotal)}</td>
                <td className="py-3 px-4 text-right text-[#6B756D]">- {formatIDR(s.platform_fee + s.discount)}</td>
                <td className="py-3 px-4 text-right font-semibold text-[#2D3A30]">{formatIDR(s.total)}</td>
                <td className="py-3 px-4 text-right font-bold text-[#4A6750]">{formatIDR(s.profit)}</td>
                <td className="py-3 px-4 text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)} data-testid={`delete-sale-${s.id}`}><Trash2 size={14} className="text-[#D17B60]" /></Button>
                </td>
              </tr>))}</tbody>
          </table></div>
        </CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white max-w-2xl" data-testid="sale-dialog">
          <DialogHeader><DialogTitle>Catat Penjualan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="sale-date-input" /></div>
              <div><Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger data-testid="sale-channel-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{channels.map((c) => (<SelectItem key={c.v} value={c.v} data-testid={`channel-${c.v}`}>{c.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Item</Label>
                <Button size="sm" variant="outline" onClick={addItem} data-testid="add-sale-item-btn"><Plus size={14} className="mr-1" /> Tambah Item</Button>
              </div>
              {form.items.length === 0 && <p className="text-xs text-[#6B756D]">Belum ada item.</p>}
              <div className="space-y-2">
                {form.items.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={it.menu_id} onValueChange={(v) => {
                      const m = menus.find((mm) => mm.id === v);
                      const next = [...form.items];
                      next[idx] = { ...next[idx], menu_id: v, menu_name: m?.name || "", price: m?.computed?.selling_price || it.price };
                      setForm({ ...form, items: next });
                    }}>
                      <SelectTrigger className="flex-1" data-testid={`sale-item-menu-${idx}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{menus.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}</SelectContent>
                    </Select>
                    <Input type="number" value={it.qty} className="w-20" placeholder="Qty"
                      onChange={(e) => { const next = [...form.items]; next[idx] = { ...next[idx], qty: Number(e.target.value) }; setForm({ ...form, items: next }); }}
                      data-testid={`sale-item-qty-${idx}`} />
                    <Input type="number" value={it.price} className="w-32" placeholder="Harga"
                      onChange={(e) => { const next = [...form.items]; next[idx] = { ...next[idx], price: Number(e.target.value) }; setForm({ ...form, items: next }); }}
                      data-testid={`sale-item-price-${idx}`} />
                    <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} data-testid={`sale-item-remove-${idx}`}><X size={14} /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Diskon (Rp)</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} data-testid="sale-discount-input" /></div>
              <div className="bg-[#F4F1EA] rounded-md p-3 flex flex-col justify-center">
                <p className="text-xs text-[#6B756D]">Subtotal</p>
                <p className="font-bold text-[#2D3A30] text-lg">{formatIDR(subtotal)}</p>
              </div>
            </div>

            <div><Label>Catatan</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="sale-notes-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="sale-cancel-btn">Batal</Button>
            <Button onClick={save} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="sale-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
