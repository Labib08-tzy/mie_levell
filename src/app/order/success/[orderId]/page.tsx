"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

interface OrderData {
  id: number;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export default function OrderSuccessPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${params.orderId}`);
        const data = await res.json();
        if (data.success) {
          setOrder(data.data);
        } else {
          setError(data.message || "Pesanan tidak ditemukan.");
        }
      } catch {
        setError("Gagal memuat data pesanan.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [params.orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500">Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
            ❌
          </div>
          <h2 className="font-bold text-slate-900 text-lg mb-2">Pesanan Tidak Ditemukan</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-[14px] text-sm font-semibold transition-colors"
          >
            Kembali ke Menu
          </Link>
        </div>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    PENDING: "Menunggu Konfirmasi",
    CONFIRMED: "Dikonfirmasi",
    PROCESSING: "Sedang Diproses",
    READY: "Siap Diambil",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  };

  const paymentLabel: Record<string, string> = {
    UNPAID: "Belum Dibayar",
    PAID: "Sudah Dibayar",
    FAILED: "Gagal",
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-card overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-8 text-center text-white">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ✅
            </div>
            <h1 className="text-xl font-bold">Pesanan Berhasil Dibuat!</h1>
            <p className="text-emerald-100 text-sm mt-1">Terima kasih atas pesanan Anda</p>
          </div>

          {/* Order Details */}
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-[16px] p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Nomor Pesanan</span>
                <span className="text-sm font-bold text-slate-900">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Total Pembayaran</span>
                <span className="text-sm font-bold text-orange-600">{formatRupiah(order.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Status Pesanan</span>
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                  {statusLabel[order.status] || order.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Status Pembayaran</span>
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                  {paymentLabel[order.paymentStatus] || order.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500">Waktu Pesanan</span>
                <span className="text-xs font-medium text-slate-700">{formatDate(order.createdAt)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href={`/orders/${order.id}`}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm rounded-[14px] shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Lihat Detail Pesanan
              </Link>
              <Link
                href="/dashboard"
                className="w-full py-3.5 border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-semibold text-sm rounded-[14px] transition-all flex items-center justify-center gap-2"
              >
                ← Kembali ke Menu
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
