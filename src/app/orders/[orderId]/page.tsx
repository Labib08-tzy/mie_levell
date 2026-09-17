"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import { useRouter } from "next/navigation";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Minimal type definition based on what we need to render
interface OrderDetail {
  id: number;
  orderNumber: string;
  customerName: string;
  phone: string;
  orderType: string;
  note: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: Array<{
    id: number;
    productName: string;
    quantity: number;
    price: number;
    spicinessLabel: string;
    spicinessPrice: number;
    note: string | null;
    subtotal: number;
    product: { gambarUrl: string | null };
    toppings: Array<{
      id: number;
      toppingName: string;
      price: number;
    }>;
  }>;
}

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ nama: string; role: string }>({ nama: "User", role: "Member" });

  useEffect(() => {
    async function fetchData() {
      try {
        const authRes = await fetch("/api/auth/me").then((res) => res.json());
        if (authRes.success) {
          setUser(authRes.data);
        } else {
          router.push("/login");
          return;
        }

        const orderRes = await fetch(`/api/orders/${params.orderId}`).then((res) => res.json());
        if (orderRes.success) {
          setOrder(orderRes.data);
        } else {
          setError(orderRes.message || "Pesanan tidak ditemukan.");
        }
      } catch (err) {
        console.error(err);
        setError("Gagal memuat detail pesanan.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.orderId, router]);

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-red-100 text-red-700 border-red-200",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "Diproses",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  };

  const handleCompleteOrder = async () => {
    if (!order || order.status !== "PENDING") return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(prev => prev ? { ...prev, status: "COMPLETED", paymentStatus: "PAID" } : null);
      } else {
        alert(data.message || "Gagal mengupdate status pesanan.");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col">
        <Navbar userName={user.nama} userRole={user.role} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-500">Memuat detail pesanan...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col">
        <Navbar userName={user.nama} userRole={user.role} />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
              ❌
            </div>
            <h2 className="font-bold text-slate-900 text-lg mb-2">Gagal Memuat Pesanan</h2>
            <p className="text-slate-500 text-sm mb-6">{error}</p>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-[14px] text-sm font-semibold transition-colors shadow-md shadow-orange-500/20"
            >
              ← Kembali ke Riwayat
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const toppingTotal = order.items.reduce((sum, item) => {
    return sum + item.toppings.reduce((tSum, t) => tSum + t.price, 0) * item.quantity;
  }, 0);

  const spicinessTotal = order.items.reduce((sum, item) => {
    return sum + item.spicinessPrice * item.quantity;
  }, 0);

  const productTotal = order.items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col pb-12">
      <Navbar userName={user.nama} userRole={user.role} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-orange-600 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Riwayat Pesanan
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Detail Pesanan</h1>
              <p className="text-sm text-slate-500 font-medium">{order.orderNumber}</p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`inline-flex items-center px-3.5 py-1.5 rounded-full border text-xs font-bold ${
                  statusColors[order.status] || "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                Status: {statusLabels[order.status] || order.status}
              </div>
              {order.status === "PENDING" && (
                <button
                  onClick={handleCompleteOrder}
                  disabled={isUpdating}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-bold rounded-full shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {isUpdating ? "Memproses..." : "Pesanan Sudah Diterima"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Info Pelanggan & Pesanan */}
          <div className="bg-white rounded-[20px] border border-slate-100 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Informasi Pesanan</h3>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Tanggal</p>
                  <p className="font-medium text-slate-900">{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Jenis Pesanan</p>
                  <p className="font-medium text-slate-900">
                    {order.orderType === "DINE_IN" ? "🍽️ Makan di Tempat" : "🥡 Bungkus"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Status Pembayaran</p>
                  <p className={`font-medium ${order.paymentStatus === "PAID" ? "text-emerald-600" : "text-amber-600"}`}>
                    {order.paymentStatus === "UNPAID" ? "Belum Dibayar" : order.paymentStatus === "PAID" ? "Sudah Dibayar" : "Gagal"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Data Pelanggan</h3>
              <div className="grid grid-cols-1 gap-y-3 text-sm">
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Nama</p>
                  <p className="font-medium text-slate-900">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">No. HP / WhatsApp</p>
                  <p className="font-medium text-slate-900">{order.phone}</p>
                </div>
                {order.note && (
                  <div>
                    <p className="text-[11px] text-slate-400 mb-0.5">Catatan Pesanan</p>
                    <p className="font-medium text-slate-900 italic">"{order.note}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Daftar Item */}
          <div className="bg-white rounded-[20px] border border-slate-100 p-5 sm:p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4">
              Item Pesanan ({order.items.length})
            </h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-[12px] overflow-hidden bg-slate-100 flex-shrink-0">
                    {item.product.gambarUrl ? (
                      <Image
                        src={item.product.gambarUrl}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍜</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{item.productName}</h4>
                        <span className="font-bold text-slate-900 text-sm flex-shrink-0">{formatRupiah(item.subtotal)}</span>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs text-orange-600 font-medium">🌶️ {item.spicinessLabel}</p>
                        {item.toppings.length > 0 && (
                          <p className="text-xs text-slate-500">
                            + {item.toppings.map((t) => t.toppingName).join(", ")}
                          </p>
                        )}
                        {item.note && (
                          <p className="text-[11px] text-slate-400 italic">📝 {item.note}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-2">{item.quantity}x @ {formatRupiah(item.price + item.spicinessPrice + item.toppings.reduce((s,t)=>s+t.price,0))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ringkasan Harga */}
          <div className="bg-white rounded-[20px] border border-slate-100 p-5 sm:p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4">Rincian Harga</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal Produk</span>
                <span className="font-medium text-slate-800">{formatRupiah(productTotal)}</span>
              </div>
              {toppingTotal > 0 && (
                <div className="flex justify-between">
                  <span>Biaya Topping</span>
                  <span className="font-medium text-slate-800">{formatRupiah(toppingTotal)}</span>
                </div>
              )}
              {spicinessTotal > 0 && (
                <div className="flex justify-between">
                  <span>Ekstra Pedas</span>
                  <span className="font-medium text-slate-800">{formatRupiah(spicinessTotal)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Biaya Layanan</span>
                <span className="font-medium text-emerald-600">GRATIS</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-2">
                <span className="font-bold text-slate-900">Total Pembayaran</span>
                <span className="text-xl font-bold text-orange-600">{formatRupiah(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
