import { useEffect, useState } from "react";
import { fetchSettings, updateSettings } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function SettingsPage() {
  const [form, setForm] = useState(null);

  useEffect(() => { fetchSettings().then(setForm); }, []);
  if (!form) return <div className="p-10">Memuat...</div>;

  const save = async () => {
    try {
      await updateSettings({
        ...form,
        default_margin_pct: Number(form.default_margin_pct),
        default_platform_fee_pct: Number(form.default_platform_fee_pct),
      });
      toast.success("Pengaturan tersimpan");
    } catch { toast.error("Gagal menyimpan"); }
  };

  return (
    <div className="p-6 sm:p-10 max-w-3xl">
      <PageHeader testId="settings-page" title="Pengaturan" subtitle="Info bisnis & default kalkulasi HPP. Ini muncul di invoice & jadi default menu baru." />

      <Card className="border-[#E5E2DC]">
        <CardContent className="p-6 space-y-5">
          <div>
            <h3 className="font-bold text-[#2D3A30] mb-3">Informasi Bisnis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Nama Bisnis</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} data-testid="biz-name-input" /></div>
              <div><Label>Tagline</Label><Input value={form.business_tagline} onChange={(e) => setForm({ ...form, business_tagline: e.target.value })} data-testid="biz-tagline-input" /></div>
              <div><Label>No. Telepon</Label><Input value={form.business_phone} onChange={(e) => setForm({ ...form, business_phone: e.target.value })} data-testid="biz-phone-input" /></div>
              <div><Label>Email</Label><Input value={form.business_email} onChange={(e) => setForm({ ...form, business_email: e.target.value })} data-testid="biz-email-input" /></div>
              <div className="sm:col-span-2"><Label>Alamat</Label><Textarea rows={2} value={form.business_address} onChange={(e) => setForm({ ...form, business_address: e.target.value })} data-testid="biz-address-input" /></div>
            </div>
          </div>

          <div className="pt-5 border-t border-[#E5E2DC]">
            <h3 className="font-bold text-[#2D3A30] mb-3">Default Kalkulasi HPP</h3>
            <p className="text-xs text-[#6B756D] mb-4">Nilai ini dipakai sebagai default saat buat menu baru. Untuk ShopeeFood biasanya komisi ~20%, GoFood/GrabFood sekitar 20-22%.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Default Margin Target (%)</Label><Input type="number" value={form.default_margin_pct} onChange={(e) => setForm({ ...form, default_margin_pct: e.target.value })} data-testid="default-margin-input" /></div>
              <div><Label>Default Fee Platform (%)</Label><Input type="number" value={form.default_platform_fee_pct} onChange={(e) => setForm({ ...form, default_platform_fee_pct: e.target.value })} data-testid="default-fee-input" /></div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={save} className="bg-[#4A6750] hover:bg-[#3B5340] text-white" data-testid="settings-save-btn">Simpan Pengaturan</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
