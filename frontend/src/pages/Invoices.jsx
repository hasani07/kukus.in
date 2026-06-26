import { useEffect, useState } from "react";
import { fetchInvoices, createInvoice, updateInvoiceStatus, deleteInvoice } from "@/lib/api";
import { formatIDR, formatDate, todayISO } from "@/lib/format";
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
import { Plus, Trash2, FileText, X, Printer } from "lucide-react";
import { toast } from "sonner";

const statusColors = {
  unpaid: "bg-[#FAEDE9] text-[#D17B60] hover:bg-[#FAEDE9]",
  paid: "bg-[#E9EFEA] text-[#4A6750] hover:bg-[#E9EFEA]",
  cancelled: "bg-[#F4F1EA] text-[#6B756D] hover:bg-[#F4F1EA]",
};
const statusLabel = { unpaid: "Belum Dibayar", paid: "Lunas", cancelled: "Dibatalkan" };

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(), due_date: "", customer_name: "", customer_phone: "", customer_address: "",
    items: [], discount: 0, tax_pct: 0, status: "unpaid", notes: "",
  });

  const load = async () => setInvoices(await fetchInvoices());
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ date: todayISO(), due_date: "", customer_name: "", customer_phone: "", customer_address: "",
      items: [], discount: 0, tax_pct: 0, status: "unpaid", notes: "" });
    setOpen(true);
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { name: "", qty: 1, price: 0 }] });

  const subtotal = form.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const taxAmt = (subtotal - Number(form.discount || 0)) * (Number(form.tax_pct || 0) / 100);
  const total = subtotal - Number(form.discount || 0) + taxAmt;

  const save = async () => {
    if (!form.customer_name.trim()) { toast.error("Nama customer wajib"); return; }
    if (form.items.length === 0) { toast.error("Minimal 1 item"); return; }
    try {
      const inv = await createInvoice({
        date: form.date,
        due_date: form.due_date || null,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone || null,
        customer_address: form.customer_address || null,
        items: form.items.map((it) => ({ name: it.name, qty: Number(it.qty), price: Number(it.price) })),
        discount: Number(form.discount) || 0,
        tax_pct: Number(form.tax_pct) || 0,
        status: form.status,
        notes: form.notes || null,
      });
      toast.success(`Invoice ${inv.invoice_number} dibuat`);
      setOpen(false); load();
    } catch (e) { toast.error("Gagal menyimpan"); }
  };

  const remove = async (id) => {
    if (!confirm("Hapus invoice ini?")) return;
    await deleteInvoice(id); toast.success("Dihapus"); load();
  };

  const setStatus = async (id, status) => {
    await updateInvoiceStatus(id, status); toast.success("Status diperbarui"); load();
  };

  const printInvoice = (id) => window.open(`/invoice/${id}/print`, "_blank");

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader
        title="Invoice"
        subtitle="Buat invoice profesional untuk catering, bulk order, atau laporan customer. Print-friendly PDF."
        testId="invoices-page"
        action={
          <Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="add-invoice-btn">
            <Plus size={16} className="mr-2" /> Buat Invoice
          </Button>
        }
      />

      {invoices.length === 0 ? (
        <EmptyState icon={FileText} title="Belum ada invoice" description="Buat invoice pertama untuk pesanan catering atau customer langganan."
          action={<Button onClick={openCreate} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="empty-add-invoice-btn">Buat Invoice</Button>} />
      ) : (
        <Card className="border-[#E5E2DC] overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F4F1EA] text-[#2D3A30]">
                    <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">No. Invoice</th>
                    <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Tanggal</th>
                    <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Customer</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider">Total</th>
                    <th className="text-left py-3 px-4 font-semibold uppercase text-xs tracking-wider">Status</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase text-xs tracking-wider w-44">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-[#E5E2DC] hover:bg-[#FDFBF7]" data-testid={`invoice-row-${inv.id}`}>
                      <td className="py-3 px-4 font-mono text-[#2D3A30]">{inv.invoice_number}</td>
                      <td className="py-3 px-4 text-[#6B756D]">{formatDate(inv.date)}</td>
                      <td className="py-3 px-4 text-[#2D3A30]">{inv.customer_name}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#2D3A30]">{formatIDR(inv.total)}</td>
                      <td className="py-3 px-4">
                        <Select value={inv.status} onValueChange={(v) => setStatus(inv.id, v)}>
                          <SelectTrigger className={`h-7 w-32 text-xs ${statusColors[inv.status]} border-0`} data-testid={`invoice-status-${inv.id}`}>
                            <SelectValue>{statusLabel[inv.status]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unpaid">Belum Dibayar</SelectItem>
                            <SelectItem value="paid">Lunas</SelectItem>
                            <SelectItem value="cancelled">Dibatalkan</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => printInvoice(inv.id)} className="mr-1" data-testid={`print-invoice-${inv.id}`}>
                          <Printer size={13} className="mr-1" /> Print
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(inv.id)} data-testid={`delete-invoice-${inv.id}`}>
                          <Trash2 size={14} className="text-[#D17B60]" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="invoice-dialog">
          <DialogHeader><DialogTitle>Buat Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="invoice-date-input" /></div>
              <div><Label>Jatuh Tempo (opsional)</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} data-testid="invoice-duedate-input" /></div>
              <div><Label>Nama Customer</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} data-testid="invoice-customer-input" /></div>
              <div><Label>No. HP (opsional)</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} data-testid="invoice-phone-input" /></div>
              <div className="col-span-2"><Label>Alamat (opsional)</Label><Textarea rows={2} value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} data-testid="invoice-address-input" /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Item</Label>
                <Button size="sm" variant="outline" onClick={addItem} data-testid="add-invoice-item-btn"><Plus size={14} className="mr-1" /> Tambah Item</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input value={it.name} placeholder="Nama item" className="flex-1"
                      onChange={(e) => { const next = [...form.items]; next[idx] = { ...next[idx], name: e.target.value }; setForm({ ...form, items: next }); }}
                      data-testid={`invoice-item-name-${idx}`} />
                    <Input type="number" value={it.qty} className="w-20" placeholder="Qty"
                      onChange={(e) => { const next = [...form.items]; next[idx] = { ...next[idx], qty: Number(e.target.value) }; setForm({ ...form, items: next }); }}
                      data-testid={`invoice-item-qty-${idx}`} />
                    <Input type="number" value={it.price} className="w-32" placeholder="Harga"
                      onChange={(e) => { const next = [...form.items]; next[idx] = { ...next[idx], price: Number(e.target.value) }; setForm({ ...form, items: next }); }}
                      data-testid={`invoice-item-price-${idx}`} />
                    <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} data-testid={`invoice-item-remove-${idx}`}><X size={14} /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Diskon (Rp)</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} data-testid="invoice-discount-input" /></div>
              <div><Label>Pajak (%)</Label><Input type="number" value={form.tax_pct} onChange={(e) => setForm({ ...form, tax_pct: e.target.value })} data-testid="invoice-tax-input" /></div>
            </div>

            <div className="bg-[#F4F1EA] rounded-md p-4 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-[#6B756D]">Subtotal</span><span className="text-[#2D3A30]">{formatIDR(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6B756D]">Diskon</span><span className="text-[#2D3A30]">- {formatIDR(form.discount || 0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6B756D]">Pajak</span><span className="text-[#2D3A30]">{formatIDR(taxAmt)}</span></div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#E5E2DC]"><span className="text-[#2D3A30]">Total</span><span className="text-[#4A6750]">{formatIDR(total)}</span></div>
            </div>

            <div><Label>Catatan</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="invoice-notes-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="invoice-cancel-btn">Batal</Button>
            <Button onClick={save} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="invoice-save-btn">Buat Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
