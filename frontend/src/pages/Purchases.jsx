import { useEffect, useState } from "react";
import { fetchPurchases, createPurchase, deletePurchase, fetchIngredients } from "@/lib/api";
import { formatIDR, formatDate, formatNumber, todayISO } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function Purchases() {
  const [items, setItems] = useState([]);
  const [ings, setIngs] = useState([]);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [form, setForm] = useState({ ingredient_id: "", qty: 0, price_per_unit: 0, date: todayISO(), supplier: "", notes: "" });

  const load = async () => {
    const [p, i] = await Promise.all([fetchPurchases(), fetchIngredients()]);
    setItems(p); setIngs(i);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ ingredient_id: ings[0]?.id || "", qty: 0, price_per_unit: 0, date: todayISO(), supplier: "", notes: "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.ingredient_id) { toast.error("Pilih bahan baku"); return; }
    if (!form.qty || form.qty <= 0) { toast.error("Qty harus > 0"); return; }
    await createPurchase({ ...form, qty: Number(form.qty), price_per_unit: Number(form.price_per_unit) });
    toast.success("Belanja tercatat, stok & harga rata-rata terupdate");
    setOpen(false); load();
  };

  const thisMonthISO = todayISO().slice(0, 7);
  const canNext = month < thisMonthISO;
  const filtered = items.filter((i) => i.date.startsWith(month));
  const total = filtered.reduce((s, i) => s + i.total_cost, 0);

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader testId="purchases-page" title="Belanja & Restock"
        subtitle="Catat tiap pembelian bahan. Sistem auto update stok & harga rata-rata (moving average) — HPP selalu akurat."
        action={<Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="add-purchase-btn" disabled={ings.length === 0}><Plus size={16} className="mr-2" /> Catat Belanja</Button>} />

      {/* Month Picker */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, -1))} className="px-2"><ChevronLeft size={16} /></Button>
        <span className="font-semibold text-[#2D3A30] min-w-[150px] text-center">{monthLabel(month)}</span>
        <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, 1))} disabled={!canNext} className="px-2"><ChevronRight size={16} /></Button>
        {month !== thisMonthISO && (
          <Button variant="ghost" size="sm" onClick={() => setMonth(thisMonthISO)} className="text-xs text-[#4A6750]">Bulan Ini</Button>
        )}
      </div>

      <Card className="border-[#E5E2DC] mb-6"><CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A1A8A3] mb-1">Total Belanja {monthLabel(month)}</p>
        <p className="text-3xl font-extrabold text-[#2D3A30]">{formatIDR(total)}</p>
        <p className="text-xs text-[#6B756D] mt-1">{filtered.length} transaksi</p>
      </CardContent></Card>

      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingCart} title={`Belum ada belanja di ${monthLabel(month)}`}
          description="Setiap belanja bahan, catat di sini. Stok otomatis bertambah & harga rata-rata terhitung supaya HPP selalu akurat."
          action={ings.length > 0 ? <Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="empty-add-purchase-btn">Catat Belanja</Button> : <p className="text-xs text-[#D17B60]">Tambah bahan baku dulu</p>} />
      ) : (
        <Card className="border-[#E5E2DC]"><CardContent className="p-0">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-[#F4F1EA] text-[#2D3A30]">
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Tanggal</th>
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Bahan</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Qty</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Harga/Unit</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Total</th>
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Supplier</th>
              <th className="text-right py-3 px-4 w-12"></th>
            </tr></thead>
            <tbody>{filtered.map((p) => (
              <tr key={p.id} className="border-b border-[#E5E2DC] hover:bg-[#FDFBF7]" data-testid={`purchase-row-${p.id}`}>
                <td className="py-3 px-4 text-[#6B756D]">{formatDate(p.date)}</td>
                <td className="py-3 px-4 font-medium text-[#2D3A30]">{p.ingredient_name}</td>
                <td className="py-3 px-4 text-right text-[#2D3A30]">{formatNumber(p.qty, 1)}</td>
                <td className="py-3 px-4 text-right text-[#6B756D]">{formatIDR(p.price_per_unit)}</td>
                <td className="py-3 px-4 text-right font-bold text-[#2D3A30]">{formatIDR(p.total_cost)}</td>
                <td className="py-3 px-4 text-[#6B756D]">{p.supplier || "-"}</td>
                <td className="py-3 px-4 text-right"><Button size="sm" variant="ghost" onClick={async () => { await deletePurchase(p.id); load(); }} data-testid={`delete-purchase-${p.id}`}><Trash2 size={14} className="text-[#D17B60]" /></Button></td>
              </tr>))}</tbody>
          </table></div>
        </CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white" data-testid="purchase-dialog">
          <DialogHeader><DialogTitle>Catat Belanja Bahan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Bahan Baku</Label>
              <Select value={form.ingredient_id} onValueChange={(v) => setForm({ ...form, ingredient_id: v })}>
                <SelectTrigger data-testid="purchase-ing-select"><SelectValue placeholder="Pilih bahan" /></SelectTrigger>
                <SelectContent>{ings.map((i) => (<SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Qty</Label><Input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} data-testid="purchase-qty-input" /></div>
              <div><Label>Harga/Unit (Rp)</Label><Input type="number" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} data-testid="purchase-price-input" /></div>
              <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="purchase-date-input" /></div>
              <div><Label>Supplier</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="opsional" data-testid="purchase-supplier-input" /></div>
            </div>
            <div className="bg-[#F4F1EA] p-3 rounded-md">
              <p className="text-xs text-[#6B756D]">Total Belanja</p>
              <p className="font-bold text-lg text-[#2D3A30]">{formatIDR((Number(form.qty) || 0) * (Number(form.price_per_unit) || 0))}</p>
            </div>
            <div><Label>Catatan</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="purchase-notes-input" /></div>
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
