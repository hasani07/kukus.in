import { useEffect, useState } from "react";
import { fetchIngredients, createIngredient, updateIngredient, deleteIngredient } from "@/lib/api";
import { formatIDR, formatNumber } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Carrot } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", unit: "gr", price_per_unit: 0, stock: 0, low_stock_threshold: 0, notes: "" };

export default function Ingredients() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  const load = async () => setItems(await fetchIngredients());
  useEffect(() => { load(); }, []);

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

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader
        title="Bahan Baku"
        subtitle="Catat semua bahan beserta harga per unit & stock. Digunakan untuk hitung HPP menu."
        testId="ingredients-page"
        action={
          <Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="add-ingredient-btn">
            <Plus size={16} className="mr-2" /> Tambah Bahan
          </Button>
        }
      />

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
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const low = it.stock <= it.low_stock_threshold;
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
                        <td className="py-3 px-4 text-right">
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
            <div>
              <Label>Catatan</Label>
              <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="opsional" data-testid="ingredient-notes-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="ingredient-cancel-btn">Batal</Button>
            <Button onClick={save} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="ingredient-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
