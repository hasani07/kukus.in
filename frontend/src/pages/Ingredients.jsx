import { useEffect, useState } from "react";
import { fetchIngredients, createIngredient, updateIngredient, deleteIngredient, fetchSettings, fetchShoppingList, fetchIngredientPriceHistory } from "@/lib/api";
import { formatIDR, formatNumber, formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Carrot, ShoppingCart, MessageCircle, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const empty = { name: "", unit: "gr", price_per_unit: 0, stock: 0, low_stock_threshold: 0, expiry_date: "", notes: "" };

const exportIngredientsCSV = (items) => {
  if (items.length === 0) return;
  const rows = [["Nama", "Unit", "Harga/Unit", "Stok", "Min. Stok", "Exp. Date", "Catatan"]];
  items.forEach((i) => rows.push([i.name, i.unit, i.price_per_unit, i.stock, i.low_stock_threshold, i.expiry_date || "", i.notes || ""]));
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `kukus-in-bahan-baku.csv`; a.click();
  URL.revokeObjectURL(url);
};

function expiryStatus(expiry_date) {
  if (!expiry_date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry_date); exp.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp - today) / 86400000);
  if (diffDays < 0) return "expired";
  if (diffDays <= 3) return "critical";
  if (diffDays <= 7) return "warning";
  return "ok";
}

function getTopSupplier(history) {
  const freq = {};
  const prices = {};
  history.forEach((h) => {
    if (!h.supplier) return;
    freq[h.supplier] = (freq[h.supplier] || 0) + 1;
    if (!prices[h.supplier] || h.price_per_unit < prices[h.supplier]) {
      prices[h.supplier] = h.price_per_unit;
    }
  });
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  return { name: top[0], count: top[1], min_price: prices[top[0]] };
}

export default function Ingredients() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopData, setShopData] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => setItems(await fetchIngredients());
  useEffect(() => { load(); }, []);

  const lowStockItems = items.filter((i) => i.low_stock_threshold > 0 && i.stock <= i.low_stock_threshold);
  const expiryAlertItems = items.filter((i) => { const s = expiryStatus(i.expiry_date); return s === "expired" || s === "critical"; });

  const openShoppingList = async () => {
    const data = await fetchShoppingList();
    setShopData(data);
    setShopOpen(true);
  };

  const shareShoppingWA = async () => {
    const s = await fetchSettings();
    const lines = ["📋 *Daftar Belanja Kukus.In*", ""];
    shopData.items.forEach((i, idx) => {
      lines.push(`${idx + 1}. ${i.name} — *${formatNumber(i.suggested_qty, 1)} ${i.unit}* (stok: ${formatNumber(i.current_stock, 1)})`);
    });
    lines.push("", `Total estimasi: *${formatIDR(shopData.total_estimate)}*`);
    const msg = lines.join("\n");
    const phone = (s.business_phone || "").replace(/[^0-9]/g, "").replace(/^0/, "62");
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const openPriceHistory = async (it) => {
    setHistoryItem(it);
    setHistoryOpen(true);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const data = await fetchIngredientPriceHistory(it.id);
      setHistory(data);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openCreate = () => { setForm(empty); setEditingId(null); setOpen(true); };
  const openEdit = (it) => { setForm({ ...empty, ...it }); setEditingId(it.id); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nama wajib diisi"); return; }
    const payload = {
      name: form.name.trim(),
      unit: form.unit.trim() || "pcs",
      price_per_unit: Number(form.price_per_unit) || 0,
      stock: Number(form.stock) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 0,
      expiry_date: form.expiry_date || null,
      notes: form.notes || null,
    };
    try {
      if (editingId) {
        await updateIngredient(editingId, payload);
        toast.success("Bahan baku diperbarui");
      } else {
        await createIngredient(payload);
        toast.success("Bahan baku ditambah");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error("Gagal menyimpan");
    }
  };

  const remove = async (id) => {
    if (!confirm("Hapus bahan ini?")) return;
    await deleteIngredient(id);
    toast.success("Dihapus");
    load();
  };

  const topSupplier = getTopSupplier(history);
  const cheapestPurchase = history.length > 0 ? history.reduce((min, h) => h.price_per_unit < min.price_per_unit ? h : min) : null;
  const chartData = [...history].reverse().map((h) => ({ date: h.date, price: h.price_per_unit }));

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader
        title="Bahan Baku"
        subtitle="Catat semua bahan beserta harga per unit & stock. Digunakan untuk hitung HPP menu."
        testId="ingredients-page"
        action={
          <div className="flex gap-2">
            <Button onClick={() => exportIngredientsCSV(items)} variant="outline" className="border-[#4A6750] text-[#4A6750]" disabled={items.length === 0} data-testid="export-ingredients-btn">
              <Download size={14} className="mr-2" /> Export CSV
            </Button>
            <Button onClick={openShoppingList} variant="outline" className="border-[#D17B60] text-[#D17B60] hover:bg-[#FAEDE9]" data-testid="shopping-list-btn">
              <ShoppingCart size={14} className="mr-2" /> Daftar Belanja
            </Button>
            <Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="add-ingredient-btn">
              <Plus size={16} className="mr-2" /> Tambah Bahan
            </Button>
          </div>
        }
      />

      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && (
        <div className="mb-3 flex items-start gap-3 p-4 bg-[#FAEDE9] border border-[#D17B60] rounded-xl">
          <AlertTriangle size={18} className="text-[#D17B60] mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-[#2D3A30]">{lowStockItems.length} bahan stok menipis</p>
            <p className="text-sm text-[#6B756D] mt-0.5">
              {lowStockItems.map((i) => `${i.name} (${formatNumber(i.stock, 1)} ${i.unit})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Expiry alert banner */}
      {expiryAlertItems.length > 0 && (
        <div className="mb-5 flex items-start gap-3 p-4 bg-amber-50 border border-amber-400 rounded-xl">
          <Clock size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-[#2D3A30]">{expiryAlertItems.length} bahan kedaluwarsa / hampir exp</p>
            <p className="text-sm text-[#6B756D] mt-0.5">
              {expiryAlertItems.map((i) => `${i.name} (exp: ${formatDate(i.expiry_date)})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Carrot}
          title="Belum ada bahan baku"
          description="Mulai dengan menambah bahan-bahan yang sering dipakai seperti ayam, beras, sayur, bumbu, dst."
          action={<Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="empty-add-ingredient-btn">Tambah Bahan Pertama</Button>}
        />
      ) : (
        <Card className="border-[#E5E2DC] overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F4F1EA] text-[#2D3A30]">
                    <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Nama</th>
                    <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Unit</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Harga / Unit</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Stock</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Min. Stock</th>
                    <th className="text-center py-3 px-4 font-semibold uppercase text-xs tracking-wider">Exp. Date</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const low = it.low_stock_threshold > 0 && it.stock <= it.low_stock_threshold;
                    return (
                      <tr key={it.id} className="border-b border-[#E5E2DC] hover:bg-[#FDFBF7]" data-testid={`ingredient-row-${it.id}`}>
                        <td className="py-3 px-4 font-medium text-[#2D3A30]">{it.name}</td>
                        <td className="py-3 px-4 text-[#6B756D]">{it.unit}</td>
                        <td className="py-3 px-4 text-right text-[#2D3A30]">{formatIDR(it.price_per_unit)}</td>
                        <td className="py-3 px-4 text-right">
                          {low ? (
                            <Badge className="bg-[#FAEDE9] text-[#D17B60] hover:bg-[#FAEDE9]">{formatNumber(it.stock, 1)} {it.unit}</Badge>
                          ) : (
                            <span className="text-[#2D3A30]">{formatNumber(it.stock, 1)} {it.unit}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-[#6B756D]">{formatNumber(it.low_stock_threshold, 1)}</td>
                        <td className="py-3 px-4 text-center">
                          {(() => {
                            const es = expiryStatus(it.expiry_date);
                            if (!es) return <span className="text-[#A1A8A3]">—</span>;
                            if (es === "expired") return <Badge className="bg-red-100 text-red-600 hover:bg-red-100">Exp {formatDate(it.expiry_date)}</Badge>;
                            if (es === "critical") return <Badge className="bg-orange-100 text-orange-600 hover:bg-orange-100">{formatDate(it.expiry_date)}</Badge>;
                            if (es === "warning") return <Badge className="bg-amber-100 text-amber-600 hover:bg-amber-100">{formatDate(it.expiry_date)}</Badge>;
                            return <span className="text-xs text-[#6B756D]">{formatDate(it.expiry_date)}</span>;
                          })()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button size="sm" variant="ghost" onClick={() => openPriceHistory(it)} title="Riwayat harga" data-testid={`history-ingredient-${it.id}`}>
                            <TrendingUp size={14} className="text-[#4A6750]" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(it)} data-testid={`edit-ingredient-${it.id}`}>
                            <Pencil size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(it.id)} data-testid={`delete-ingredient-${it.id}`}>
                            <Trash2 size={14} className="text-[#D17B60]" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white" data-testid="ingredient-dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Bahan Baku" : "Tambah Bahan Baku"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Bahan</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ayam fillet" data-testid="ingredient-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Satuan (unit)</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="gr / ml / pcs" data-testid="ingredient-unit-input" />
              </div>
              <div>
                <Label>Harga per Unit (Rp)</Label>
                <Input type="number" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} data-testid="ingredient-price-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stock Sekarang</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} data-testid="ingredient-stock-input" />
              </div>
              <div>
                <Label>Min. Stock (alert)</Label>
                <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} data-testid="ingredient-min-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal Kedaluwarsa</Label>
                <Input type="date" value={form.expiry_date || ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} data-testid="ingredient-expiry-input" />
              </div>
              <div>
                <Label>Catatan</Label>
                <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="opsional" data-testid="ingredient-notes-input" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="ingredient-cancel-btn">Batal</Button>
            <Button onClick={save} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="ingredient-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shopping list dialog */}
      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent className="bg-white max-w-2xl" data-testid="shopping-list-dialog">
          <DialogHeader><DialogTitle>📋 Daftar Belanja</DialogTitle></DialogHeader>
          {shopData && (
            <div>
              {shopData.items.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-[#4A6750] font-semibold">✅ Stok semua aman!</p>
                  <p className="text-sm text-[#6B756D] mt-2">Tidak ada bahan yang perlu direstock saat ini.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {shopData.items.map((i, idx) => (
                      <div key={i.ingredient_id} className="flex justify-between items-center p-3 bg-[#F4F1EA] rounded-md">
                        <div>
                          <p className="font-semibold text-[#2D3A30]">{idx + 1}. {i.name}</p>
                          <p className="text-xs text-[#6B756D]">Stok: {formatNumber(i.current_stock, 1)} / Min: {formatNumber(i.threshold, 1)} {i.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#D17B60]">{formatNumber(i.suggested_qty, 1)} {i.unit}</p>
                          <p className="text-xs text-[#6B756D]">~ {formatIDR(i.estimated_cost)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-[#E9EFEA] rounded-md flex justify-between">
                    <span className="font-semibold text-[#2D3A30]">Total Estimasi Belanja</span>
                    <span className="font-extrabold text-[#4A6750]">{formatIDR(shopData.total_estimate)}</span>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShopOpen(false)} data-testid="shopping-close-btn">Tutup</Button>
            {shopData?.items.length > 0 && (
              <Button onClick={shareShoppingWA} className="bg-[#25D366] hover:bg-[#1FA855] text-white" data-testid="shopping-wa-btn">
                <MessageCircle size={14} className="mr-2" /> Share via WhatsApp
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price history dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Riwayat Harga — {historyItem?.name}</DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <p className="text-sm text-[#6B756D] py-4">Memuat...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-[#6B756D] py-4">Belum ada riwayat pembelian untuk bahan ini. Catat pembelian di halaman Belanja &amp; Restock.</p>
          ) : (
            <div className="space-y-4">
              {/* Supplier insights */}
              <div className="grid grid-cols-2 gap-3">
                {topSupplier && (
                  <div className="p-3 bg-[#E9EFEA] rounded-lg">
                    <p className="text-xs uppercase tracking-wider text-[#6B756D] mb-1">Supplier Terfavorit</p>
                    <p className="font-bold text-[#2D3A30]">{topSupplier.name}</p>
                    <p className="text-xs text-[#6B756D]">{topSupplier.count}x beli · termurah {formatIDR(topSupplier.min_price)}/{historyItem?.unit}</p>
                  </div>
                )}
                {cheapestPurchase && (
                  <div className="p-3 bg-[#E9EFEA] rounded-lg">
                    <p className="text-xs uppercase tracking-wider text-[#6B756D] mb-1">Harga Termurah</p>
                    <p className="font-bold text-[#4A6750]">{formatIDR(cheapestPurchase.price_per_unit)}/{historyItem?.unit}</p>
                    <p className="text-xs text-[#6B756D]">{formatDate(cheapestPurchase.date)}{cheapestPurchase.supplier ? ` · ${cheapestPurchase.supplier}` : ""}</p>
                  </div>
                )}
              </div>

              {/* Trend chart */}
              {chartData.length >= 2 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B756D] mb-2">Tren Harga per Unit</p>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="#E5E2DC" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#6B756D", fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fill: "#6B756D", fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={40} />
                      <Tooltip
                        contentStyle={{ background: "white", border: "1px solid #E5E2DC", borderRadius: 8, fontSize: 11 }}
                        formatter={(v) => [formatIDR(v), "Harga/unit"]}
                      />
                      <Line type="monotone" dataKey="price" stroke="#4A6750" strokeWidth={2} dot={{ r: 3 }} name="Harga/unit" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* History table */}
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F4F1EA]">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-[#2D3A30]">Tanggal</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-[#2D3A30]">Qty</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-[#2D3A30]">Harga/Unit</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-[#2D3A30]">Total</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-[#2D3A30]">Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => {
                      const cpu = h.contents_per_unit ?? 1;
                      const qtyLabel = h.purchase_unit && cpu > 1
                        ? `${formatNumber(h.purchase_qty ?? h.qty, 1)} ${h.purchase_unit}`
                        : `${formatNumber(h.qty, 1)} ${historyItem?.unit || ""}`;
                      return (
                        <tr key={h.id} className="border-b border-[#E5E2DC] hover:bg-[#FDFBF7]">
                          <td className="py-2 px-3 text-[#6B756D]">{formatDate(h.date)}</td>
                          <td className="py-2 px-3 text-right text-[#2D3A30]">{qtyLabel}</td>
                          <td className="py-2 px-3 text-right text-[#2D3A30]">{formatIDR(h.price_per_unit)}</td>
                          <td className="py-2 px-3 text-right font-semibold">{formatIDR(h.total_cost || 0)}</td>
                          <td className="py-2 px-3 text-[#6B756D]">{h.supplier || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
