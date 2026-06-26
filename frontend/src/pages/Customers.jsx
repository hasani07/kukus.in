import { useEffect, useState } from "react";
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer, fetchSettings } from "@/lib/api";
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
import { Plus, Pencil, Trash2, Users, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";

const TYPES = { regular: "Regular", catering: "Catering", corporate: "Corporate" };

export default function Customers() {
  const [items, setItems] = useState([]);
  const [biz, setBiz] = useState(null);
  const [open, setOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waMsg, setWaMsg] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", customer_type: "regular", notes: "" });
  const [editId, setEditId] = useState(null);

  const load = async () => {
    const [c, s] = await Promise.all([fetchCustomers(), fetchSettings()]);
    setItems(c); setBiz(s);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nama wajib"); return; }
    if (editId) await updateCustomer(editId, form);
    else await createCustomer(form);
    toast.success("Tersimpan");
    setOpen(false); setEditId(null);
    setForm({ name: "", phone: "", address: "", customer_type: "regular", notes: "" });
    load();
  };

  const openWA = (c) => {
    const greeting = `Halo${c.name ? ` ${c.name}` : ""}! 👋\n\nTerima kasih sudah jadi pelanggan ${biz?.business_name || "Kukus.In"}.\n\nMau pesan healthy food lagi? Boleh DM saya menu yg diinginkan, ya!\n\n${biz?.business_phone || ""}`;
    setWaMsg(greeting);
    setForm({ ...form, phone: c.phone || "" });
    setWaOpen(true);
  };

  const sendWA = (phone) => {
    if (!phone) { toast.error("No HP customer kosong"); return; }
    let p = phone.replace(/[^0-9]/g, "");
    if (p.startsWith("0")) p = "62" + p.slice(1);
    const url = `https://wa.me/${p}?text=${encodeURIComponent(waMsg)}`;
    window.open(url, "_blank");
  };

  const orderFormLink = () => {
    const msg = `Halo ${biz?.business_name || "Kukus.In"}! Saya mau order:\n\n- Menu: \n- Qty: \n- Nama: \n- Alamat: \n- Catatan: `;
    if (!biz?.business_phone) { toast.error("Set nomor HP bisnis di Pengaturan"); return; }
    let p = biz.business_phone.replace(/[^0-9]/g, "");
    if (p.startsWith("0")) p = "62" + p.slice(1);
    const url = `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
    navigator.clipboard.writeText(url);
    toast.success("Link order WhatsApp disalin! Share ke customer untuk bypass fee 20%");
  };

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader testId="customers-page" title="Customer" subtitle="Database pelanggan langganan & catering. Generate link order WhatsApp untuk bypass fee ShopeeFood 20%."
        action={
          <div className="flex gap-2">
            <Button onClick={orderFormLink} variant="outline" className="border-[#4A6750] text-[#4A6750]" data-testid="copy-order-link-btn">
              <Copy size={14} className="mr-2" /> Copy Link WA Order
            </Button>
            <Button onClick={() => { setEditId(null); setForm({ name: "", phone: "", address: "", customer_type: "regular", notes: "" }); setOpen(true); }} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="add-customer-btn">
              <Plus size={16} className="mr-2" /> Tambah Customer
            </Button>
          </div>
        } />

      {items.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada customer" description="Catat customer langganan & catering untuk follow-up. Bisa kirim WhatsApp langsung dari sini."
          action={<Button onClick={() => setOpen(true)} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="empty-add-customer-btn">Tambah Customer</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <Card key={c.id} className="border-[#E5E2DC]" data-testid={`customer-card-${c.id}`}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-[#2D3A30]">{c.name}</h3>
                    <Badge variant="outline" className="mt-1 text-xs">{TYPES[c.customer_type] || c.customer_type}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditId(c.id); setForm({ ...c, notes: c.notes || "", phone: c.phone || "", address: c.address || "" }); setOpen(true); }} data-testid={`edit-customer-${c.id}`}><Pencil size={13} /></Button>
                    <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Hapus?")) { await deleteCustomer(c.id); load(); }}} data-testid={`delete-customer-${c.id}`}><Trash2 size={13} className="text-[#D17B60]" /></Button>
                  </div>
                </div>
                {c.phone && <p className="text-sm text-[#6B756D] mb-1">📱 {c.phone}</p>}
                {c.address && <p className="text-xs text-[#6B756D] mb-2 line-clamp-2">{c.address}</p>}
                {c.notes && <p className="text-xs text-[#6B756D] italic line-clamp-2">{c.notes}</p>}
                {c.phone && (
                  <Button size="sm" onClick={() => openWA(c)} className="w-full mt-3 bg-[#E9EFEA] text-[#4A6750] hover:bg-[#D4E0D6]" data-testid={`wa-customer-${c.id}`}>
                    <MessageCircle size={13} className="mr-1" /> WhatsApp
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white" data-testid="customer-dialog">
          <DialogHeader><DialogTitle>{editId ? "Edit Customer" : "Tambah Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="customer-name-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>No. HP</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxx" data-testid="customer-phone-input" /></div>
              <div><Label>Tipe</Label>
                <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
                  <SelectTrigger data-testid="customer-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="catering">Catering</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Alamat</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="customer-address-input" /></div>
            <div><Label>Catatan</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="preferensi, alergi, dll" data-testid="customer-notes-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="customer-cancel-btn">Batal</Button>
            <Button onClick={save} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="customer-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="bg-white" data-testid="wa-dialog">
          <DialogHeader><DialogTitle>Kirim WhatsApp</DialogTitle></DialogHeader>
          <Textarea rows={6} value={waMsg} onChange={(e) => setWaMsg(e.target.value)} data-testid="wa-msg-input" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaOpen(false)} data-testid="wa-cancel-btn">Batal</Button>
            <Button onClick={() => { sendWA(form.phone); setWaOpen(false); }} className="bg-[#25D366] hover:bg-[#1FA855] text-white" data-testid="wa-send-btn">
              <MessageCircle size={14} className="mr-1" /> Buka WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
