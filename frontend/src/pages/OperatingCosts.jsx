import { useEffect, useState } from "react";
import { fetchOpCosts, createOpCost, updateOpCost, deleteOpCost } from "@/lib/api";
import { formatIDR, formatDate, todayISO } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { v: "rent", label: "Sewa Tempat" },
  { v: "utility", label: "Listrik/Air/Gas" },
  { v: "salary", label: "Gaji Karyawan" },
  { v: "marketing", label: "Marketing & Promo" },
  { v: "equipment", label: "Peralatan" },
  { v: "internet", label: "Internet & Telpon" },
  { v: "transport", label: "Transport/Bensin" },
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

const emptyForm = { name: "", category: "rent", amount: 0, frequency: "monthly", date: todayISO(), notes: "" };

export default function OperatingCosts() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [form, setForm] = useState(emptyForm);

  const load = async () => setItems(await fetchOpCosts());
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setOpen(true); };
  const openEdit = (item) => { setForm({ name: item.name, category: item.category, amount: item.amount, frequency: item.frequency, date: item.date, notes: item.notes || "" }); setEditingId(item.id); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nama wajib"); return; }
    const payload = { ...form, amount: Number(form.amount) };
    if (editingId) {
      await updateOpCost(editingId, payload);
      toast.success("Biaya diperbarui");
    } else {
      await createOpCost(payload);
      toast.success("Biaya tercatat");
    }
    setOpen(false);
    setForm(emptyForm);
    load();
  };

  const thisMonthISO = todayISO().slice(0, 7);
  const canNext = month < thisMonthISO;
  const filtered = items.filter((i) => i.date.startsWith(month));
  const total = filtered.reduce((s, i) => s + i.amount, 0);
  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    total: filtered.filter((i) => i.category === c.v).reduce((s, i) => s + i.amount, 0),
  })).filter((c) => c.total > 0);

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader testId="opcosts-page" title="Biaya Operasional"
        subtitle="Catat semua biaya non-bahan (sewa, listrik, gaji, marketing). Wajib untuk laporan laba-rugi yang akurat."
        action={<Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="add-opcost-btn"><Plus size={16} className="mr-2" /> Tambah Biaya</Button>} />

      {/* Month Picker */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, -1))} className="px-2"><ChevronLeft size={16} /></Button>
        <span className="font-semibold text-[#2D3A30] min-w-[150px] text-center">{monthLabel(month)}</span>
        <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, 1))} disabled={!canNext} className="px-2"><ChevronRight size={16} /></Button>
        {month !== thisMonthISO && (
          <Button variant="ghost" size="sm" onClick={() => setMonth(thisMonthISO)} className="text-xs text-[#4A6750]">Bulan Ini</Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="border-[#E5E2DC]"><CardContent className="p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#A1A8A3] mb-1">Total Biaya {monthLabel(month)}</p>
          <p className="text-3xl font-extrabold text-[#2D3A30]">{formatIDR(total)}</p>
          <p className="text-xs text-[#6B756D] mt-1">{filtered.length} item tercatat</p>
        </CardContent></Card>
        {byCategory.length > 0 && (
          <Card className="border-[#E5E2DC]"><CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#A1A8A3] mb-2">Per Kategori</p>
            <div className="space-y-1">
              {byCategory.map((c) => (
                <div key={c.v} className="flex justify-between text-sm">
                  <span className="text-[#6B756D]">{c.label}</span>
                  <span className="font-semibold text-[#2D3A30]">{formatIDR(c.total)}</span>
                </div>
              ))}
            </div>
          </CardContent></Card>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Wallet} title={`Belum ada biaya di ${monthLabel(month)}`}
          description="Mulai catat sewa, listrik, gaji, dll. Tanpa data ini, profit di dashboard belum mencerminkan untung beneran."
          action={<Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="empty-add-opcost-btn">Tambah Biaya</Button>} />
      ) : (
        <Card className="border-[#E5E2DC]"><CardContent className="p-0">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-[#F4F1EA] text-[#2D3A30]">
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Tanggal</th>
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Nama</th>
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Kategori</th>
              <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Frekuensi</th>
              <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Jumlah</th>
              <th className="text-right py-3 px-4 w-12"></th>
            </tr></thead>
            <tbody>{filtered.map((i) => (
              <tr key={i.id} className="border-b border-[#E5E2DC] hover:bg-[#FDFBF7]" data-testid={`opcost-row-${i.id}`}>
                <td className="py-3 px-4 text-[#6B756D]">{formatDate(i.date)}</td>
                <td className="py-3 px-4 font-medium text-[#2D3A30]">{i.name}</td>
                <td className="py-3 px-4"><Badge variant="outline">{CATEGORIES.find((c) => c.v === i.category)?.label || i.category}</Badge></td>
                <td className="py-3 px-4 text-[#6B756D]">{i.frequency === "monthly" ? "Bulanan" : i.frequency === "daily" ? "Harian" : "Sekali"}</td>
                <td className="py-3 px-4 text-right font-bold text-[#2D3A30]">{formatIDR(i.amount)}</td>
                <td className="py-3 px-4 text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(i)} data-testid={`edit-opcost-${i.id}`}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={async () => { if (!confirm("Hapus biaya ini?")) return; await deleteOpCost(i.id); load(); }} data-testid={`delete-opcost-${i.id}`}><Trash2 size={14} className="text-[#D17B60]" /></Button>
                </td>
              </tr>))}</tbody>
          </table></div>
        </CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white" data-testid="opcost-dialog">
          <DialogHeader><DialogTitle>{editingId ? "Edit Biaya Operasional" : "Tambah Biaya Operasional"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sewa dapur" data-testid="opcost-name-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="opcost-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => (<SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Frekuensi</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger data-testid="opcost-freq-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                    <SelectItem value="daily">Harian</SelectItem>
                    <SelectItem value="one-time">Sekali</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Jumlah (Rp)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="opcost-amount-input" /></div>
              <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="opcost-date-input" /></div>
            </div>
            <div><Label>Catatan</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="opcost-notes-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="opcost-cancel-btn">Batal</Button>
            <Button onClick={save} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="opcost-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
