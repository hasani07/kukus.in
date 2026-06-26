export const formatIDR = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "Rp 0";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
};

export const formatNumber = (n, decimals = 0) => {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return Number(n).toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatDate = (iso) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const channelLabel = (c) => ({
  shopeefood: "ShopeeFood",
  gofood: "GoFood",
  grabfood: "GrabFood",
  "dine-in": "Dine-In",
  cash: "Cash",
  other: "Lainnya",
}[c] || c);
