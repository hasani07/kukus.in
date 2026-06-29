import { useEffect, useState } from "react";
import { fetchPackaging, createPackaging, updatePackaging, deletePackaging, fetchPackagingPriceHistory } from "@/lib/api";
import { formatIDR, formatNumber, formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function getTopSupplier(history) {
  const freq = {};
  const prices = {};
  history.forEach((h) => {
    if (!h.supplier) return;
    freq[h.supplier] = (freq[h.supplier] || 0) + 1;
    if (!prices[h.supplier] || h.price_per_unit < prices[h.supplier]) prices[h.supplier] = h.price_per_unit;
  });
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  return { name: top[0], count: top[1], min_price: prices[top[0]] };
}

const empty = { name: "", price_per_unit: 0, stock: 0, low_stock_threshold: 0, notes: "" };

export default function Packaging() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => setItems(await fetchPackaging());
  useEffect(() => { load(); }, []);

  const lowStockItems = items.filter((i) => i.low_stock_threshold > 0 && i.stock <= i.low_stock_threshold);

  const openPriceHistory = async (it) => {
    setHistoryItem(it);
    setHistoryOpen(true);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const data = await fetchPackagingPriceHistory(it.id);
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
      price_per_unit: Number(form.price_per_unit) || 0,
      stock: Number(form.stock) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 0,
      notes: form.notes || null,
    };
    try {
      if (editingId) { await updatePackaging(editingId, payload); toast.success("Diperbarui"); }
      else { await createPackaging(payload); toast.success("Ditambah"); }
      setOpen(false);
      load();
    } catch (e) { toast.error("Gagal menyimpan"); }
  };

  const remove = async (id) => {
    if (!confirm("Hapus packaging ini?")) return;
    await deletePackaging(id);
    toast.success("Dihapus");
    load();
  };

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader
        title="Packaging"
        subtitle="Catat kemasan: box, plastik, sendok, label. Biaya per pcs ikut hitung HPP."
        testId="packaging-page"
        action={
          <Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="add-packaging-btn">
            <Plus size={16} className="mr-2" /> Tambah Packaging
          </Button>
        }
      />

      {/* Low stock banner */}
      {lowStockItems.length > 0 && (
        <div className="mb-5 flex items-start gap-3 p-4 bg-[#FAEDE9] border border-[#D17B60] rounded-xl">
          <AlertTriangle size={18} className="text-[#D17B60] mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-[#2D3A30]">{lowStockItems.length} packaging stok menipis</p>
            <p className="text-sm text-[#6B756D] mt-0.5">{lowStockItems.map((i) => `${i.name} (${formatNumber(i.stock, 0)} pcs)`).join(" · ")}</p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Belum ada item packaging"
          description="Tambah jenis-jenis kemasan: box kraft, plastik mika, sendok plastik, dll."
          action={<Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="empty-add-packaging-btn">Tambah Packaging</Button>}
        />
      ) : (
        <Card className="border-[#E5E2DC] overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F4F1EA] text-[#2D3A30]">
                    <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Nama</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Harga / pcs</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Stock</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Min. Stock</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const low = it.low_stock_threshold > 0 && it.stock <= it.low_stock_threshold;
                    return (
                      <tr key={it.id} className="border-b border-[#E5E2DC] hover:bg-[#FDFBF7]" data-testid={`packaging-row-${it.id}`}>
                        <td className="py-3 px-4 font-medium text-[#2D3A30]">{it.name}</td>
                        <td className="py-3 px-4 text-right text-[#2D3A30]">{formatIDR(it.price_per_unit)}</td>
                        <td className="py-3 px-4 text-right">
                          {low ? <Badge className="bg-[#FAEDE9] text-[#D17B60] hover:bg-[#FAEDE9]">{formatNumber(it.stock, 0)}</Badge> : <span>{formatNumber(it.stock, 0)}</span>}
                        </td>
                        <td className="py-3 px-4 text-right text-[#6B756D]">{formatNumber(it.low_stock_threshold, 0)}</td>
                        <td className="py-3 px-4 text-right">
                          <Button size="sm" variant="ghost" onClick={() => openPriceHistory(it)} title="Riwayat harga" data-testid={`history-packaging-${it.id}`}><TrendingUp size={14} className="text-[#4A6750]" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(it)} data-testid={`edit-packaging-${it.id}`}><Pencil size={14} /></Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(it.id)} data-testid={`delete-packaging-${it.id}`}><Trash2 size={14} className="text-[#D17B60]" /></Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white" data-testid="packaging-dialog">
          <DialogHeader><DialogTitle>{editingId ? "Edit Packaging" : "Tambah Packaging"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Box Kraft Medium" data-testid="packaging-name-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Harga / pcs (Rp)</Label><Input type="number" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} data-testid="packaging-price-input" /></div>
              <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} data-testid="packaging-stock-input" /></div>
            </div>
            <div><Label>Min. Stock (alert)</Label><Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} data-testid="packaging-min-input" /></div>
            <div><Label>Catatan</Label><Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="packaging-notes-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="packaging-cancel-btn">Batal</Button>
            <Button onClick={save} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="packaging-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price history dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader><DialogTitle>Riwayat Harga — {historyItem?.name}</DialogTitle></DialogHeader>
          {historyLoading ? (
            <p className="text-sm text-[#6B756D] py-4">Memuat...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-[#6B756D] py-4">Belum ada riwayat restock untuk packaging ini. Catat di halaman Belanja &amp; Restock.</p>
          ) : (
            <div className="space-y-4">
              {(() => {
                const topSup = getTopSupplier(history);
                const cheapest = history.reduce((min, h) => h.price_per_unit < min.price_per_unit ? h : min);
                const chartData = [...history].reverse().map((h) => ({ date: h.date, price: h.price_per_unit }));
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {topSup && (
                        <div className="p-3 bg-[#E9EFEA] rounded-lg">
                          <p className="text-xs uppercase tracking-wider text-[#6B756D] mb-1">Supplier Terfavorit</p>
                          <p className="font-bold text-[#2D3A30]">{topSup.name}</p>
                          <p className="text-xs text-[#6B756D]">{topSup.count}x beli · termurah {formatIDR(topSup.min_price)}/pcs</p>
                        </div>
                      )}
                      <div className="p-3 bg-[#E9EFEA] rounded-lg">
                        <p className="text-xs uppercase tracking-wider text-[#6B756D] mb-1">Harga Termurah</p>
                        <p className="font-bold text-[#4A6750]">{formatIDR(cheapest.price_per_unit)}/pcs</p>
                        <p className="text-xs text-[#6B756D]">{formatDate(cheapest.date)}{cheapest.supplier ? ` · ${cheapest.supplier}` : ""}</p>
                      </div>
                    </div>
                    {chartData.length >= 2 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#6B756D] mb-2">Tren Harga per pcs</p>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={chartData}>
                            <CartesianGrid stroke="#E5E2DC" strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: "#6B756D", fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                            <YAxis tick={{ fill: "#6B756D", fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={40} />
                            <Tooltip contentStyle={{ background: "white", border: "1px solid #E5E2DC", borderRadius: 8, fontSize: 11 }} formatter={(v) => [formatIDR(v), "Harga/pcs"]} />
                            <Line type="monotone" dataKey="price" stroke="#D17B60" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="max-h-52 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-[#F4F1EA]">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-[#2D3A30]">Tanggal</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-[#2D3A30]">Qty</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-[#2D3A30]">Harga/pcs</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-[#2D3A30]">Total</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-[#2D3A30]">Supplier</th>
                        </tr></thead>
                        <tbody>{history.map((h) => {
                          const cpu = h.contents_per_unit ?? 1;
                          const qtyLabel = h.purchase_unit && cpu > 1
                            ? `${formatNumber(h.purchase_qty ?? h.qty, 1)} ${h.purchase_unit}`
                            : `${formatNumber(h.qty, 0)} pcs`;
                          return (
                            <tr key={h.id} className="border-b border-[#E5E2DC] hover:bg-[#FDFBF7]">
                              <td className="py-2 px-3 text-[#6B756D]">{formatDate(h.date)}</td>
                              <td className="py-2 px-3 text-right text-[#2D3A30]">{qtyLabel}</td>
                              <td className="py-2 px-3 text-right text-[#2D3A30]">{formatIDR(h.price_per_unit)}</td>
                              <td className="py-2 px-3 text-right font-semibold">{formatIDR(h.total_cost || 0)}</td>
                              <td className="py-2 px-3 text-[#6B756D]">{h.supplier || "-"}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
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
