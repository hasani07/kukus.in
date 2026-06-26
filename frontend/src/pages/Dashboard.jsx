import { useEffect, useState } from "react";
import { fetchDashboard } from "@/lib/api";
import { formatIDR, formatNumber, channelLabel } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Wallet, Receipt, Percent, AlertTriangle, ShoppingBag } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const Stat = ({ icon: Icon, label, value, hint, accent }) => (
  <Card className="border-[#E5E2DC]">
    <CardContent className="p-6">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A1A8A3]">{label}</p>
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${accent || "bg-[#E9EFEA] text-[#4A6750]"}`}>
          <Icon size={17} />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-[#2D3A30] tracking-tight">{value}</p>
      {hint && <p className="text-xs text-[#6B756D] mt-2">{hint}</p>}
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDashboard(period).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [period]);

  return (
    <div className="p-6 sm:p-10 max-w-[1400px]">
      <PageHeader
        testId="dashboard-page"
        title="Dashboard"
        subtitle="Pantau kesehatan finansial Kukus.In — pendapatan, profit, dan menu terlaris dalam sekejap."
        action={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px] bg-white" data-testid="period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d" data-testid="period-7d">7 Hari Terakhir</SelectItem>
              <SelectItem value="30d" data-testid="period-30d">30 Hari Terakhir</SelectItem>
              <SelectItem value="90d" data-testid="period-90d">90 Hari Terakhir</SelectItem>
              <SelectItem value="365d" data-testid="period-365d">1 Tahun Terakhir</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {loading ? (
        <p className="text-[#6B756D]">Memuat...</p>
      ) : data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <Stat icon={Wallet} label="Pendapatan Bersih" value={formatIDR(data.total_revenue)} hint={`${data.total_orders} order`} />
            <Stat icon={TrendingUp} label="Laba Bersih" value={formatIDR(data.total_profit)} hint={`HPP: ${formatIDR(data.total_hpp)}`} accent="bg-[#FAEDE9] text-[#D17B60]" />
            <Stat icon={Percent} label="Margin" value={`${data.margin_pct.toFixed(1)}%`} hint="terhadap pendapatan bersih" />
            <Stat icon={ShoppingBag} label="Item Terjual" value={formatNumber(data.total_items_sold)} hint="total qty" accent="bg-[#FAEDE9] text-[#D17B60]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="border-[#E5E2DC] lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-[#2D3A30]">Tren Penjualan</h3>
                    <p className="text-xs text-[#6B756D]">Pendapatan & Profit harian</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.trend}>
                    <CartesianGrid stroke="#E5E2DC" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#6B756D", fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fill: "#6B756D", fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip
                      contentStyle={{ background: "white", border: "1px solid #E5E2DC", borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => formatIDR(v)}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#4A6750" strokeWidth={2.5} dot={false} name="Pendapatan" />
                    <Line type="monotone" dataKey="profit" stroke="#D17B60" strokeWidth={2.5} dot={false} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-[#E5E2DC]">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg text-[#2D3A30] mb-1">Menu Terlaris</h3>
                <p className="text-xs text-[#6B756D] mb-4">Top 5 berdasarkan qty</p>
                {data.best_sellers.length === 0 ? (
                  <p className="text-sm text-[#6B756D]">Belum ada penjualan.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.best_sellers} layout="vertical" margin={{ left: 0 }}>
                      <CartesianGrid stroke="#E5E2DC" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#6B756D", fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: "#2D3A30", fontSize: 11 }} width={90} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #E5E2DC", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="qty" fill="#4A6750" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-[#E5E2DC]">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg text-[#2D3A30] mb-4">Performa per Channel</h3>
                {data.channels.length === 0 ? (
                  <p className="text-sm text-[#6B756D]">Belum ada data.</p>
                ) : (
                  <div className="space-y-3">
                    {data.channels.map((c) => (
                      <div key={c.channel} className="flex items-center justify-between p-3 bg-[#F4F1EA] rounded-md">
                        <div>
                          <p className="font-semibold text-[#2D3A30]">{channelLabel(c.channel)}</p>
                          <p className="text-xs text-[#6B756D]">{c.orders} order</p>
                        </div>
                        <p className="font-bold text-[#2D3A30]">{formatIDR(c.revenue)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#E5E2DC]">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={18} className="text-[#FBBF24]" />
                  <h3 className="font-bold text-lg text-[#2D3A30]">Alert Stock Menipis</h3>
                </div>
                {data.low_stock_ingredients.length === 0 && data.low_stock_packaging.length === 0 ? (
                  <p className="text-sm text-[#6B756D]">Aman, semua stock cukup.</p>
                ) : (
                  <div className="space-y-2">
                    {data.low_stock_ingredients.map((i) => (
                      <div key={i.id} className="flex items-center justify-between p-3 bg-[#FAEDE9] rounded-md">
                        <div>
                          <p className="font-semibold text-[#2D3A30] text-sm">{i.name}</p>
                          <p className="text-xs text-[#6B756D]">Bahan baku</p>
                        </div>
                        <Badge className="bg-[#D17B60] text-white hover:bg-[#D17B60]">{formatNumber(i.stock, 1)} {i.unit}</Badge>
                      </div>
                    ))}
                    {data.low_stock_packaging.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-[#FAEDE9] rounded-md">
                        <div>
                          <p className="font-semibold text-[#2D3A30] text-sm">{p.name}</p>
                          <p className="text-xs text-[#6B756D]">Packaging</p>
                        </div>
                        <Badge className="bg-[#D17B60] text-white hover:bg-[#D17B60]">{formatNumber(p.stock, 1)} pcs</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
