import { useEffect, useState } from "react";
import { fetchPurchases, createPurchase, deletePurchase, fetchIngredients, fetchPackaging } from "@/lib/api";
import { formatIDR, formatDate, formatNumber, todayISO } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ShoppingCart, ChevronLeft, ChevronRight, Package, Download } from "lucide-react";
import { toast } from "sonner";

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

const emptyForm = () => ({
  item_type: "ingredient",
  ingredient_id: "",
  packaging_id: "",
  purchase_qty: 1,
  purchase_unit: "",
  contents_per_unit: 1,
  price_per_purchase_unit: 0,
  date: todayISO(),
  supplier: "",
  notes: "",
});

function getItemName(p) {
  return p.item_name || p.ingredient_name || "-";
}

const exportPurchasesCSV = (purchases, label) => {
  if (purchases.length === 0) { return; }
  const rows = [["Tanggal", "Item", "Tipe", "Qty Beli", "Satuan Beli", "Isi/Satuan", "Harga Beli", "Harga/Unit", "Total", "Supplier", "Catatan"]];
  purchases.forEach((p) => {
    rows.push([
      p.date,
      getItemName(p),
      (p.item_type || "ingredient") === "packaging" ? "Packaging" : "Bahan Baku",
      p.purchase_qty ?? p.qty ?? 0,
      p.purchase_unit || "",
      p.contents_per_unit ?? 1,
      p.price_per_purchase_unit || p.price_per_unit || 0,
      p.price_per_unit || 0,
      p.total_cost || 0,
      p.supplier || "",
      p.notes || "",
    ]);
  });
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `kukus-in-belanja-${label}.csv`; a.click();
  URL.revokeObjectURL(url);
};

function getPurchaseLabel(p) {
  const pqty = p.purchase_qty ?? p.qty ?? 0;
  const unit = p.purchase_unit || "";
  const cpu = p.contents_per_unit ?? 1;
  if (unit && cpu > 1) {
    return `${formatNumber(pqty, 1)} ${unit} (${formatNumber(pqty * cpu, 1)} unit)`;
  }
  return `${formatNumber(p.qty ?? pqty, 1)}`;
}

export default function Purchases() {
  const [items, setItems] = useState([]);
  const [ings, setIngs] = useState([]);
  const [packs, setPacks] = useState([]);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [activeTab, setActiveTab] = useState("ingredient");
  const [form, setForm] = useState(emptyForm());

  const load = async () => {
    const [p, i, pk] = await Promise.all([fetchPurchases(), fetchIngredients(), fetchPackaging()]);
    setItems(p); setIngs(i); setPacks(pk);
  };
  useEffect(() => { load(); }, []);

  const openCreate = (type = "ingredient") => {
    setActiveTab(type);
    const f = emptyForm();
    f.item_type = type;
    if (type === "ingredient") f.ingredient_id = ings[0]?.id || "";
    else f.packaging_id = packs[0]?.id || "";
    setForm(f);
    setOpen(true);
  };

  const baseQty = (Number(form.purchase_qty) || 0) * (Number(form.contents_per_unit) || 1);
  const basePrice = (Number(form.contents_per_unit) || 1) > 0
    ? (Number(form.price_per_purchase_unit) || 0) / (Number(form.contents_per_unit) || 1)
    : 0;
  const totalCost = (Number(form.purchase_qty) || 0) * (Number(form.price_per_purchase_unit) || 0);

  const selectedIng = ings.find((i) => i.id === form.ingredient_id);
  const selectedPack = packs.find((p) => p.id === form.packaging_id);

  const save = async () => {
    if (form.item_type === "ingredient" && !form.ingredient_id) { toast.error("Pilih bahan baku"); return; }
    if (form.item_type === "packaging" && !form.packaging_id) { toast.error("Pilih packaging"); return; }
    if (!form.purchase_qty || Number(form.purchase_qty) <= 0) { toast.error("Qty harus > 0"); return; }
    if (!form.price_per_purchase_unit || Number(form.price_per_purchase_unit) <= 0) { toast.error("Harga harus > 0"); return; }
    try {
      await createPurchase({
        item_type: form.item_type,
        ingredient_id: form.item_type === "ingredient" ? form.ingredient_id : undefined,
        packaging_id: form.item_type === "packaging" ? form.packaging_id : undefined,
        purchase_qty: Number(form.purchase_qty),
        purchase_unit: form.purchase_unit.trim(),
        contents_per_unit: Number(form.contents_per_unit) || 1,
        price_per_purchase_unit: Number(form.price_per_purchase_unit),
        date: form.date,
        supplier: form.supplier.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast.success("Belanja tercatat — stok & harga rata-rata terupdate");
      setOpen(false); load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan");
    }
  };

  const thisMonthISO = todayISO().slice(0, 7);
  const canNext = month < thisMonthISO;
  const filtered = items.filter((i) => i.date.startsWith(month));
  const filteredIng = filtered.filter((i) => (i.item_type || "ingredient") === "ingredient");
  const filteredPack = filtered.filter((i) => i.item_type === "packaging");
  const total = filtered.reduce((s, i) => s + (i.total_cost || 0), 0);
  const totalIng = filteredIng.reduce((s, i) => s + (i.total_cost || 0), 0);
  const totalPack = filteredPack.reduce((s, i) => s + (i.total_cost || 0), 0);

  const canAdd = ings.length > 0 || packs.length > 0;

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader testId="purchases-page" title="Belanja & Restock"
        subtitle="Catat pembelian bahan & packaging. Stok & harga rata-rata terupdate otomatis — HPP selalu akurat."
        action={
          <div className="flex gap-2">
            <Button onClick={() => exportPurchasesCSV(filtered, month)} variant="outline" className="border-[#4A6750] text-[#4A6750]" disabled={filtered.length === 0}>
              <Download size={14} className="mr-2" /> Export CSV
            </Button>
            <Button onClick={() => openCreate("packaging")} variant="outline" className="border-[#D17B60] text-[#D17B60] hover:bg-[#FAEDE9]" disabled={packs.length === 0}>
              <Package size={14} className="mr-2" /> Restock Packaging
            </Button>
            <Button onClick={() => openCreate("ingredient")} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="add-purchase-btn" disabled={ings.length === 0}>
              <Plus size={16} className="mr-2" /> Catat Belanja
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-[#E5E2DC]"><CardContent className="p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#A1A8A3] mb-1">Total Belanja {monthLabel(month)}</p>
          <p className="text-3xl font-extrabold text-[#2D3A30]">{formatIDR(total)}</p>
          <p className="text-xs text-[#6B756D] mt-1">{filtered.length} transaksi</p>
        </CardContent></Card>
        <Card className="border-[#E5E2DC]"><CardContent className="p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#A1A8A3] mb-1">Bahan Baku</p>
          <p className="text-2xl font-extrabold text-[#2D3A30]">{formatIDR(totalIng)}</p>
          <p className="text-xs text-[#6B756D] mt-1">{filteredIng.length} transaksi</p>
        </CardContent></Card>
        <Card className="border-[#E5E2DC]"><CardContent className="p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#A1A8A3] mb-1">Packaging</p>
          <p className="text-2xl font-extrabold text-[#D17B60]">{formatIDR(totalPack)}</p>
          <p className="text-xs text-[#6B756D] mt-1">{filteredPack.length} transaksi</p>
        </CardContent></Card>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingCart} title={`Belum ada belanja di ${monthLabel(month)}`}
          description="Setiap belanja bahan atau restock packaging, catat di sini. Stok & harga rata-rata otomatis terhitung."
          action={canAdd ? <Button onClick={() => openCreate("ingredient")} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="empty-add-purchase-btn">Catat Belanja</Button> : <p className="text-xs text-[#D17B60]">Tambah bahan baku dulu</p>} />
      ) : (
        <Card className="border-[#E5E2DC]"><CardContent className="p-0">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-[#F4F1EA] text-[#2D3A30]">
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Tanggal</th>
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Item</th>
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Tipe</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Qty Beli</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Harga Beli</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Harga/Unit</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Total</th>
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Supplier</th>
              <th className="text-right py-3 px-4 w-12"></th>
            </tr></thead>
            <tbody>{filtered.map((p) => {
              const ppu = p.price_per_purchase_unit || p.price_per_unit || 0;
              const cpu = p.contents_per_unit ?? 1;
              const isConversion = p.purchase_unit && cpu > 1;
              return (
                <tr key={p.id} className="border-b border-[#E5E2DC] hover:bg-[#FDFBF7]" data-testid={`purchase-row-${p.id}`}>
                  <td className="py-3 px-4 text-[#6B756D]">{formatDate(p.date)}</td>
                  <td className="py-3 px-4 font-medium text-[#2D3A30]">{getItemName(p)}</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={(p.item_type || "ingredient") === "packaging" ? "border-[#D17B60] text-[#D17B60]" : "border-[#4A6750] text-[#4A6750]"}>
                      {(p.item_type || "ingredient") === "packaging" ? "Packaging" : "Bahan"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right text-[#2D3A30]">
                    {getPurchaseLabel(p)}
                    {isConversion && <span className="block text-xs text-[#6B756D]">{p.purchase_unit}</span>}
                  </td>
                  <td className="py-3 px-4 text-right text-[#6B756D]">{formatIDR(ppu)}{p.purchase_unit ? `/${p.purchase_unit}` : ""}</td>
                  <td className="py-3 px-4 text-right text-[#6B756D]">{formatIDR(p.price_per_unit || 0)}/unit</td>
                  <td className="py-3 px-4 text-right font-bold text-[#2D3A30]">{formatIDR(p.total_cost || 0)}</td>
                  <td className="py-3 px-4 text-[#6B756D]">{p.supplier || "-"}</td>
                  <td className="py-3 px-4 text-right"><Button size="sm" variant="ghost" onClick={async () => { await deletePurchase(p.id); load(); }} data-testid={`delete-purchase-${p.id}`}><Trash2 size={14} className="text-[#D17B60]" /></Button></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        </CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white max-w-lg" data-testid="purchase-dialog">
          <DialogHeader>
            <DialogTitle>Catat Belanja / Restock</DialogTitle>
            {/* Tabs */}
            <div className="flex gap-1 mt-3 p-1 bg-[#F4F1EA] rounded-lg w-fit">
              <button
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${form.item_type === "ingredient" ? "bg-white shadow text-[#2D3A30]" : "text-[#6B756D] hover:text-[#2D3A30]"}`}
                onClick={() => { setForm({ ...emptyForm(), item_type: "ingredient", ingredient_id: ings[0]?.id || "", date: form.date, supplier: form.supplier }); }}
              >
                Bahan Baku
              </button>
              <button
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${form.item_type === "packaging" ? "bg-white shadow text-[#2D3A30]" : "text-[#6B756D] hover:text-[#2D3A30]"}`}
                onClick={() => { setForm({ ...emptyForm(), item_type: "packaging", packaging_id: packs[0]?.id || "", date: form.date, supplier: form.supplier }); }}
              >
                Packaging
              </button>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            {/* Item selector */}
            <div>
              <Label>{form.item_type === "ingredient" ? "Bahan Baku" : "Packaging"}</Label>
              {form.item_type === "ingredient" ? (
                <Select value={form.ingredient_id} onValueChange={(v) => setForm({ ...form, ingredient_id: v })}>
                  <SelectTrigger data-testid="purchase-ing-select"><SelectValue placeholder="Pilih bahan" /></SelectTrigger>
                  <SelectContent>{ings.map((i) => (<SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>))}</SelectContent>
                </Select>
              ) : (
                <Select value={form.packaging_id} onValueChange={(v) => setForm({ ...form, packaging_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih packaging" /></SelectTrigger>
                  <SelectContent>{packs.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                </Select>
              )}
            </div>

            {/* Bulk purchase fields */}
            <div className="bg-[#F4F1EA] p-3 rounded-lg space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6B756D]">Satuan Pembelian</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Qty Beli</Label>
                  <Input type="number" min="0.01" step="0.01" value={form.purchase_qty}
                    onChange={(e) => setForm({ ...form, purchase_qty: e.target.value })}
                    placeholder="1" data-testid="purchase-qty-input" />
                </div>
                <div>
                  <Label className="text-xs">Satuan Beli</Label>
                  <Input value={form.purchase_unit}
                    onChange={(e) => setForm({ ...form, purchase_unit: e.target.value })}
                    placeholder="tray / pak / kg" data-testid="purchase-unit-input" />
                </div>
                <div>
                  <Label className="text-xs">Isi per Satuan</Label>
                  <Input type="number" min="1" step="1" value={form.contents_per_unit}
                    onChange={(e) => setForm({ ...form, contents_per_unit: e.target.value })}
                    placeholder="1" data-testid="purchase-contents-input" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Harga per {form.purchase_unit || "unit"} (Rp)</Label>
                <Input type="number" min="0" value={form.price_per_purchase_unit}
                  onChange={(e) => setForm({ ...form, price_per_purchase_unit: e.target.value })}
                  data-testid="purchase-price-input" />
              </div>
              {/* Computed preview */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#E5E2DC]">
                <div>
                  <p className="text-xs text-[#6B756D]">Total unit masuk stok</p>
                  <p className="font-bold text-[#2D3A30]">
                    {formatNumber(baseQty, 2)} {form.item_type === "ingredient" ? (selectedIng?.unit || "unit") : "pcs"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6B756D]">Harga per unit</p>
                  <p className="font-bold text-[#2D3A30]">{formatIDR(basePrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B756D]">Total bayar</p>
                  <p className="font-bold text-[#4A6750]">{formatIDR(totalCost)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="purchase-date-input" /></div>
              <div><Label>Supplier</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="opsional" data-testid="purchase-supplier-input" /></div>
            </div>
            <div><Label>Catatan</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="opsional" data-testid="purchase-notes-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="purchase-cancel-btn">Batal</Button>
            <Button onClick={save} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="purchase-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
