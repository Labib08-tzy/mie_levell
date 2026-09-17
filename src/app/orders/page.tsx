"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface OrderSummary {
  id: number;
  orderNumber: string;
  orderType: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  itemCount: number;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ nama: string; role: string }>({ nama: "User", role: "Member" });

  useEffect(() => {
    async function fetchData() {
      try {
        const [authRes, ordersRes] = await Promise.all([
          fetch("/api/auth/me").then((res) => res.json()),
          fetch("/api/orders").then((res) => res.json()),
        ]);

        if (authRes.success) {
          setUser(authRes.data);
        } else {
          router.push("/login");
          return;
        }

        if (ordersRes.success) {
          setOrders(ordersRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "Diproses",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  };

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Navbar userName={user.nama} userRole={user.role} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pesanan Saya</h1>
            <p className="text-sm text-slate-500 mt-1">Lacak dan lihat riwayat pesanan Anda.</p>
          </div>
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-[12px] transition-colors"
          >
            ← Kembali ke Menu
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-500">Memuat riwayat pesanan...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-slate-100 p-10 text-center shadow-card mt-6">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
              📝
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Belum Ada Pesanan</h2>
            <p className="text-sm text-slate-500 mb-6">Anda belum pernah membuat pesanan sebelumnya.</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-[14px] text-sm font-semibold transition-colors shadow-md shadow-orange-500/20"
            >
              Mulai Pesan Sekarang
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-[20px] border border-slate-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-slate-900">{order.orderNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          statusColors[order.status] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Waktu: <span className="font-medium text-slate-700">{formatDate(order.createdAt)}</span></p>
                      <p>Tipe: <span className="font-medium text-slate-700">{order.orderType === "DINE_IN" ? "Makan di Tempat" : "Bungkus"}</span></p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:gap-2">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-slate-400">Total Pembayaran ({order.itemCount} Item)</p>
                      <p className="text-base font-bold text-orange-600">{formatRupiah(order.total)}</p>
                    </div>
                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-[10px] transition-colors"
                    >
                      Lihat Detail
                      <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
