import { useEffect, useState } from "react";
import { fetchMenus, fetchIngredients, fetchPackaging, createMenu, updateMenu, deleteMenu, fetchSettings, previewHpp } from "@/lib/api";
import { formatIDR, formatNumber } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, UtensilsCrossed, X, Sparkles, Store, Smartphone } from "lucide-react";
import { toast } from "sonner";

const PLATFORM_COLOR = {
  shopeefood: "text-[#EE4D2D]",
  gofood: "text-[#00AA13]",
  grabfood: "text-[#00B14F]",
};

const emptyMenu = {
  name: "", description: "", image_url: "",
  ingredients: [], packaging: [],
  labor_cost: 0, overhead_cost: 0,
  margin_target_pct: 60,
  offline_margin_pct: 40,
  platform_fee_pct: 20,
  selling_price: 0, use_recommended_price: true, yield_per_batch: 1, active: true,
  offline_price: 0,
};

export default function Menus() {
  const [menus, setMenus] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [packaging, setPackaging] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyMenu);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    const [m, i, p] = await Promise.all([fetchMenus(), fetchIngredients(), fetchPackaging()]);
    setMenus(m); setIngredients(i); setPackaging(p);
  };
  useEffect(() => { load(); }, []);

  // Live preview HPP
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        const p = await previewHpp({
          name: form.name || "x",
          ingredients: form.ingredients,
          packaging: form.packaging,
          labor_cost: Number(form.labor_cost) || 0,
          overhead_cost: Number(form.overhead_cost) || 0,
          margin_target_pct: Number(form.margin_target_pct) || 0,
          offline_margin_pct: Number(form.offline_margin_pct) || 0,
          platform_fee_pct: Number(form.platform_fee_pct) || 0,
          selling_price: Number(form.selling_price) || 0,
          use_recommended_price: form.use_recommended_price,
          yield_per_batch: Number(form.yield_per_batch) || 1,
          offline_price: Number(form.offline_price) || 0,
        });
        setPreview(p);
      } catch (err) {
        console.error("Preview HPP failed:", err);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [form, open]);

  const openCreate = async () => {
    const s = await fetchSettings();
    setForm({
      ...emptyMenu,
      offline_margin_pct: s.default_margin_pct ?? 40,
      margin_target_pct: s.default_margin_pct ?? 60,
    });
    setEditingId(null);
    setOpen(true);
  };
  const openEdit = (m) => {
    setForm({ ...emptyMenu, ...m, offline_margin_pct: m.offline_margin_pct ?? m.margin_target_pct ?? 40 });
    setEditingId(m.id);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nama menu wajib diisi"); return; }
    const payload = {
      ...form,
      labor_cost: Number(form.labor_cost) || 0,
      overhead_cost: Number(form.overhead_cost) || 0,
      margin_target_pct: Number(form.margin_target_pct) || 0,
      offline_margin_pct: Number(form.offline_margin_pct) || 0,
      platform_fee_pct: Number(form.platform_fee_pct) || 0,
      selling_price: Number(form.selling_price) || 0,
      offline_price: Number(form.offline_price) || 0,
      yield_per_batch: Number(form.yield_per_batch) || 1,
    };
    try {
      if (editingId) await updateMenu(editingId, payload);
      else await createMenu(payload);
      toast.success("Menu tersimpan");
      setOpen(false); load();
    } catch (e) { toast.error("Gagal menyimpan"); }
  };

  const remove = async (id) => {
    if (!confirm("Hapus menu ini?")) return;
    await deleteMenu(id);
    toast.success("Dihapus");
    load();
  };

  const addIng = () => {
    if (ingredients.length === 0) { toast.error("Tambah Bahan Baku dulu di halaman Bahan Baku"); return; }
    setForm({ ...form, ingredients: [...form.ingredients, { ingredient_id: ingredients[0].id, qty: 0 }] });
  };
  const addPack = () => {
    if (packaging.length === 0) { toast.error("Tambah Packaging dulu di halaman Packaging"); return; }
    setForm({ ...form, packaging: [...form.packaging, { packaging_id: packaging[0].id, qty: 1 }] });
  };

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader
        title="Menu & HPP"
        subtitle="Susun resep tiap menu, sistem auto-hitung HPP & harga jual terpisah untuk offline dan tiap platform delivery."
        testId="menus-page"
        action={
          <Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="add-menu-btn">
            <Plus size={16} className="mr-2" /> Tambah Menu
          </Button>
        }
      />

      {menus.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Belum ada menu"
          description="Tambah menu pertamamu! Pilih bahan, tentukan margin offline & fee platform, biarkan sistem hitung harga jual optimal."
          action={<Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="empty-add-menu-btn">Buat Menu Pertama</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map((m) => (
            <Card key={m.id} className="border-[#E5E2DC] overflow-hidden" data-testid={`menu-card-${m.id}`}>
              <CardContent className="p-0">
                {m.image_url ? (
                  <img src={m.image_url} alt={m.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-[#E9EFEA] flex items-center justify-center">
                    <UtensilsCrossed size={36} className="text-[#4A6750]" />
                  </div>
                )}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-lg text-[#2D3A30]">{m.name}</h3>
                      {m.description && <p className="text-xs text-[#6B756D] mt-0.5 line-clamp-2">{m.description}</p>}
                    </div>
                    {!m.active && <Badge variant="outline" className="text-[#6B756D]">Nonaktif</Badge>}
                  </div>

                  {/* HPP + Offline */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E2DC]">
                    <div>
                      <p className="text-xs text-[#A1A8A3] uppercase tracking-wider">HPP</p>
                      <p className="font-bold text-[#2D3A30]">{formatIDR(m.computed?.hpp)}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Store size={10} className="text-[#4A6750]" />
                        <p className="text-xs text-[#A1A8A3] uppercase tracking-wider">Offline / Cash</p>
                      </div>
                      <p className="font-bold text-[#4A6750]">{formatIDR(m.computed?.offline_price)}</p>
                      <p className="text-[10px] text-[#6B756D]">margin {(m.computed?.profit_margin_pct || 0).toFixed(0)}% · profit {formatIDR(m.computed?.profit_per_unit)}</p>
                    </div>
                  </div>

                  {/* Platform prices */}
                  {m.computed?.platform_prices?.length > 0 && (
                    <div className="pt-2 border-t border-[#E5E2DC]">
                      <div className="flex items-center gap-1 mb-2">
                        <Smartphone size={10} className="text-[#6B756D]" />
                        <p className="text-xs text-[#A1A8A3] uppercase tracking-wider">Platform</p>
                      </div>
                      <div className="space-y-1">
                        {m.computed.platform_prices.map((p) => (
                          <div key={p.key} className="flex items-center justify-between text-xs">
                            <span className={`font-semibold ${PLATFORM_COLOR[p.key] || "text-[#2D3A30]"}`}>{p.label}</span>
                            <div className="text-right">
                              <span className="font-bold text-[#2D3A30]">{formatIDR(p.price)}</span>
                              <span className="text-[#6B756D] ml-1.5">bersih {formatIDR(p.net_received)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(m)} className="flex-1" data-testid={`edit-menu-${m.id}`}>
                      <Pencil size={13} className="mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(m.id)} data-testid={`delete-menu-${m.id}`}>
                      <Trash2 size={13} className="text-[#D17B60]" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="menu-dialog">
          <DialogHeader><DialogTitle>{editingId ? "Edit Menu" : "Tambah Menu"}</DialogTitle></DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: form inputs */}
            <div className="lg:col-span-3 space-y-4">
              <div>
                <Label>Nama Menu</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ayam Kukus Bumbu Kuning" data-testid="menu-name-input" />
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Textarea rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="menu-desc-input" />
              </div>
              <div>
                <Label>URL Gambar (opsional)</Label>
                <Input value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." data-testid="menu-image-input" />
              </div>

              {/* Bahan Baku */}
              <div className="pt-2 border-t border-[#E5E2DC]">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-semibold">Bahan Baku</Label>
                  <Button size="sm" variant="outline" onClick={addIng} data-testid="add-recipe-ingredient-btn">
                    <Plus size={14} className="mr-1" /> Tambah Bahan
                  </Button>
                </div>
                {form.ingredients.length === 0 && <p className="text-xs text-[#6B756D]">Belum ada bahan.</p>}
                <div className="space-y-2">
                  {form.ingredients.map((ri, idx) => {
                    const ing = ingredients.find((i) => i.id === ri.ingredient_id);
                    return (
                      <div key={idx} className="flex gap-2 items-center">
                        <Select value={ri.ingredient_id} onValueChange={(v) => {
                          const next = [...form.ingredients]; next[idx] = { ...next[idx], ingredient_id: v };
                          setForm({ ...form, ingredients: next });
                        }}>
                          <SelectTrigger className="flex-1" data-testid={`recipe-ing-select-${idx}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ingredients.map((i) => (<SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Input type="number" value={ri.qty} className="w-24" placeholder="Qty"
                          onChange={(e) => {
                            const next = [...form.ingredients]; next[idx] = { ...next[idx], qty: Number(e.target.value) };
                            setForm({ ...form, ingredients: next });
                          }} data-testid={`recipe-ing-qty-${idx}`} />
                        <span className="text-xs text-[#6B756D] w-10">{ing?.unit}</span>
                        <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== idx) })} data-testid={`recipe-ing-remove-${idx}`}>
                          <X size={14} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Packaging */}
              <div className="pt-2 border-t border-[#E5E2DC]">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-semibold">Packaging</Label>
                  <Button size="sm" variant="outline" onClick={addPack} data-testid="add-recipe-packaging-btn">
                    <Plus size={14} className="mr-1" /> Tambah Packaging
                  </Button>
                </div>
                {form.packaging.length === 0 && <p className="text-xs text-[#6B756D]">Belum ada packaging.</p>}
                <div className="space-y-2">
                  {form.packaging.map((rp, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Select value={rp.packaging_id} onValueChange={(v) => {
                        const next = [...form.packaging]; next[idx] = { ...next[idx], packaging_id: v };
                        setForm({ ...form, packaging: next });
                      }}>
                        <SelectTrigger className="flex-1" data-testid={`recipe-pack-select-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {packaging.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Input type="number" value={rp.qty} className="w-24" placeholder="Qty"
                        onChange={(e) => {
                          const next = [...form.packaging]; next[idx] = { ...next[idx], qty: Number(e.target.value) };
                          setForm({ ...form, packaging: next });
                        }} data-testid={`recipe-pack-qty-${idx}`} />
                      <span className="text-xs text-[#6B756D] w-10">pcs</span>
                      <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, packaging: form.packaging.filter((_, i) => i !== idx) })} data-testid={`recipe-pack-remove-${idx}`}>
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Biaya produksi */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E5E2DC]">
                <div><Label>Yield per Batch (porsi)</Label><Input type="number" value={form.yield_per_batch} onChange={(e) => setForm({ ...form, yield_per_batch: e.target.value })} data-testid="menu-yield-input" /></div>
                <div className="flex items-end text-xs text-[#6B756D]">1 resep → {form.yield_per_batch || 1} porsi. Bahan/labor auto dibagi.</div>
                <div><Label>Biaya Tenaga Kerja / pcs</Label><Input type="number" value={form.labor_cost} onChange={(e) => setForm({ ...form, labor_cost: e.target.value })} data-testid="menu-labor-input" /></div>
                <div><Label>Overhead (gas, listrik) / pcs</Label><Input type="number" value={form.overhead_cost} onChange={(e) => setForm({ ...form, overhead_cost: e.target.value })} data-testid="menu-overhead-input" /></div>
              </div>

              {/* Harga Offline */}
              <div className="pt-3 border-t border-[#E5E2DC] space-y-3">
                <div className="flex items-center gap-2">
                  <Store size={15} className="text-[#4A6750]" />
                  <Label className="text-base font-semibold text-[#4A6750]">Harga Offline / Cash / Dine-In</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Target Margin Offline (%)</Label>
                    <Input type="number" value={form.offline_margin_pct} onChange={(e) => setForm({ ...form, offline_margin_pct: e.target.value })} placeholder="40" data-testid="menu-offline-margin-input" />
                    <p className="text-xs text-[#6B756D] mt-1">Profit dari harga jual offline</p>
                  </div>
                  <div>
                    <Label>Harga Offline Manual (Rp)</Label>
                    <Input type="number" value={form.offline_price} onChange={(e) => setForm({ ...form, offline_price: e.target.value })} placeholder="opsional, override rekomendasi" data-testid="menu-offline-price-input" />
                    <p className="text-xs text-[#6B756D] mt-1">Kosongkan = pakai rekomendasi</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <Label>Pakai Harga Rekomendasi untuk Online</Label>
                    <p className="text-xs text-[#6B756D]">Jika nonaktif, atur harga platform manual.</p>
                  </div>
                  <Switch checked={form.use_recommended_price} onCheckedChange={(v) => setForm({ ...form, use_recommended_price: v })} data-testid="menu-use-rec-switch" />
                </div>
                {!form.use_recommended_price && (
                  <div>
                    <Label>Harga Jual Platform Manual (Rp)</Label>
                    <Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} data-testid="menu-manual-price-input" />
                  </div>
                )}
              </div>

              {/* Platform info */}
              <div className="pt-3 border-t border-[#E5E2DC]">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone size={15} className="text-[#6B756D]" />
                  <Label className="text-base font-semibold text-[#6B756D]">Harga Platform</Label>
                </div>
                <p className="text-xs text-[#6B756D]">Harga ShopeeFood, GoFood & GrabFood otomatis dihitung agar net yang kamu terima = harga offline. Fee tiap platform diatur di menu <span className="font-semibold">Pengaturan</span>.</p>
              </div>
            </div>

            {/* Right: HPP calculator */}
            <div className="lg:col-span-2">
              <div className="bg-[#F4F1EA] rounded-lg p-5 sticky top-0 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#D17B60]" />
                  <h4 className="font-bold text-[#2D3A30]">Kalkulator HPP</h4>
                </div>

                {preview && (
                  <>
                    {/* Breakdown biaya */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-[#6B756D]">Bahan Baku</span><span className="font-medium text-[#2D3A30]">{formatIDR(preview.ingredients_cost)}</span></div>
                      <div className="flex justify-between"><span className="text-[#6B756D]">Packaging</span><span className="font-medium text-[#2D3A30]">{formatIDR(preview.packaging_cost)}</span></div>
                      <div className="flex justify-between"><span className="text-[#6B756D]">Tenaga Kerja</span><span className="font-medium text-[#2D3A30]">{formatIDR(preview.labor_cost)}</span></div>
                      <div className="flex justify-between"><span className="text-[#6B756D]">Overhead</span><span className="font-medium text-[#2D3A30]">{formatIDR(preview.overhead_cost)}</span></div>
                      <div className="flex justify-between border-t border-[#E5E2DC] pt-2">
                        <span className="font-semibold text-[#2D3A30]">Total HPP</span>
                        <span className="font-bold text-[#2D3A30]">{formatIDR(preview.hpp)}</span>
                      </div>
                    </div>

                    {/* Offline section */}
                    <div className="bg-white rounded-md p-3 border border-[#4A6750]/30">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Store size={12} className="text-[#4A6750]" />
                        <p className="text-xs font-bold uppercase tracking-wider text-[#4A6750]">Offline / Cash / Dine-In</p>
                      </div>
                      <p className="text-2xl font-extrabold text-[#4A6750]">{formatIDR(preview.offline_price)}</p>
                      <p className="text-xs text-[#6B756D] mt-1">
                        Profit: <span className="font-semibold text-[#2D3A30]">{formatIDR(preview.profit_per_unit)}</span>
                        {" · "}Margin: <span className="font-semibold text-[#2D3A30]">{(preview.profit_margin_pct || 0).toFixed(1)}%</span>
                      </p>
                      {preview.psychological_prices?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[#E5E2DC]">
                          <p className="text-xs text-[#A1A8A3] mb-1">💡 Harga Psikologis</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {preview.psychological_prices.map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setForm({ ...form, offline_price: p })}
                                className="text-xs px-2 py-1 bg-[#F4F1EA] hover:bg-[#E5E2DC] rounded text-[#2D3A30] font-mono"
                                data-testid={`psych-price-${p}`}
                              >
                                {formatIDR(p)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Platform prices section */}
                    {preview.platform_prices?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Smartphone size={12} className="text-[#6B756D]" />
                          <p className="text-xs font-bold uppercase tracking-wider text-[#6B756D]">Harga Platform</p>
                        </div>
                        <div className="space-y-2">
                          {preview.platform_prices.map((p) => (
                            <div key={p.key} className="bg-white rounded-md p-3 border border-[#E5E2DC]" data-testid={`platform-price-${p.key}`}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className={`text-xs font-bold ${PLATFORM_COLOR[p.key] || "text-[#2D3A30]"}`}>
                                    {p.label} <span className="text-[#A1A8A3] font-normal">· fee {p.fee_pct}%</span>
                                  </p>
                                  <p className="text-[11px] text-[#6B756D] mt-0.5">
                                    Bersih: <span className="font-bold text-[#2D3A30]">{formatIDR(p.net_received)}</span>
                                  </p>
                                  <p className="text-[11px] text-[#6B756D]">
                                    Profit: {formatIDR(p.profit_per_unit)} · Margin: {(p.margin_pct ?? 0).toFixed(1)}%
                                  </p>
                                </div>
                                <p className="text-base font-extrabold text-[#2D3A30]">{formatIDR(p.price)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-[#A1A8A3] mt-2">Net tiap platform ≈ harga offline. Fee diatur di Pengaturan.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="menu-cancel-btn">Batal</Button>
            <Button onClick={save} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="menu-save-btn">Simpan Menu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
