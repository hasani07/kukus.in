import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchInvoice, fetchSettings } from "@/lib/api";
import { formatIDR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function InvoicePrint() {
  const { id } = useParams();
  const [inv, setInv] = useState(null);
  const [biz, setBiz] = useState(null);

  useEffect(() => {
    Promise.all([fetchInvoice(id), fetchSettings()]).then(([i, s]) => { setInv(i); setBiz(s); });
  }, [id]);

  if (!inv || !biz) return <div className="p-10 text-[#6B756D]">Memuat...</div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-6 sm:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="no-print flex justify-between items-center mb-6">
          <h2 className="font-bold text-xl text-[#2D3A30]">Invoice #{inv.invoice_number}</h2>
          <Button onClick={() => window.print()} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="print-btn">
            <Printer size={16} className="mr-2" /> Print / Save PDF
          </Button>
        </div>

        <div className="invoice-print bg-white border border-[#E5E2DC] rounded-lg p-10 shadow-sm">
          <div className="flex justify-between items-start mb-10 pb-6 border-b border-[#E5E2DC]">
            <div>
              <h1 className="text-3xl font-extrabold text-[#2D3A30]">{biz.business_name}<span className="text-[#D17B60]">.</span></h1>
              <p className="text-sm text-[#6B756D] mt-1">{biz.business_tagline}</p>
              {biz.business_address && <p className="text-xs text-[#6B756D] mt-3 max-w-xs">{biz.business_address}</p>}
              {biz.business_phone && <p className="text-xs text-[#6B756D]">{biz.business_phone}</p>}
              {biz.business_email && <p className="text-xs text-[#6B756D]">{biz.business_email}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-[#A1A8A3] font-bold">Invoice</p>
              <p className="text-2xl font-extrabold text-[#2D3A30] mt-1">{inv.invoice_number}</p>
              <p className="text-xs text-[#6B756D] mt-2">Tanggal: <span className="font-semibold text-[#2D3A30]">{formatDate(inv.date)}</span></p>
              {inv.due_date && <p className="text-xs text-[#6B756D]">Jatuh Tempo: <span className="font-semibold text-[#2D3A30]">{formatDate(inv.due_date)}</span></p>}
              <div className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold ${
                inv.status === "paid" ? "bg-[#E9EFEA] text-[#4A6750]" :
                inv.status === "cancelled" ? "bg-[#F4F1EA] text-[#6B756D]" :
                "bg-[#FAEDE9] text-[#D17B60]"}`}>
                {inv.status === "paid" ? "LUNAS" : inv.status === "cancelled" ? "DIBATALKAN" : "BELUM DIBAYAR"}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs uppercase tracking-wider text-[#A1A8A3] font-bold mb-2">Ditagihkan Kepada</p>
            <p className="font-bold text-[#2D3A30] text-lg">{inv.customer_name}</p>
            {inv.customer_phone && <p className="text-sm text-[#6B756D]">{inv.customer_phone}</p>}
            {inv.customer_address && <p className="text-sm text-[#6B756D] whitespace-pre-line max-w-md">{inv.customer_address}</p>}
          </div>

          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-[#2D3A30]">
                <th className="text-left py-3 text-xs uppercase tracking-wider text-[#2D3A30] font-bold">Deskripsi</th>
                <th className="text-right py-3 text-xs uppercase tracking-wider text-[#2D3A30] font-bold w-20">Qty</th>
                <th className="text-right py-3 text-xs uppercase tracking-wider text-[#2D3A30] font-bold w-32">Harga</th>
                <th className="text-right py-3 text-xs uppercase tracking-wider text-[#2D3A30] font-bold w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, idx) => (
                <tr key={idx} className="border-b border-[#E5E2DC]">
                  <td className="py-3 text-[#2D3A30]">{it.name}</td>
                  <td className="py-3 text-right text-[#6B756D]">{it.qty}</td>
                  <td className="py-3 text-right text-[#6B756D]">{formatIDR(it.price)}</td>
                  <td className="py-3 text-right font-semibold text-[#2D3A30]">{formatIDR(it.qty * it.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-[#6B756D]">Subtotal</span><span className="text-[#2D3A30]">{formatIDR(inv.subtotal)}</span></div>
              {inv.discount > 0 && <div className="flex justify-between text-sm"><span className="text-[#6B756D]">Diskon</span><span className="text-[#2D3A30]">- {formatIDR(inv.discount)}</span></div>}
              {inv.tax_amount > 0 && <div className="flex justify-between text-sm"><span className="text-[#6B756D]">Pajak ({inv.tax_pct}%)</span><span className="text-[#2D3A30]">{formatIDR(inv.tax_amount)}</span></div>}
              <div className="flex justify-between text-lg font-extrabold pt-3 border-t-2 border-[#2D3A30]">
                <span className="text-[#2D3A30]">TOTAL</span>
                <span className="text-[#4A6750]">{formatIDR(inv.total)}</span>
              </div>
            </div>
          </div>

          {inv.notes && (
            <div className="mt-10 pt-6 border-t border-[#E5E2DC]">
              <p className="text-xs uppercase tracking-wider text-[#A1A8A3] font-bold mb-2">Catatan</p>
              <p className="text-sm text-[#6B756D] whitespace-pre-line">{inv.notes}</p>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-[#E5E2DC] text-center">
            <p className="text-xs text-[#A1A8A3]">Terima kasih atas kepercayaannya kepada {biz.business_name}!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
