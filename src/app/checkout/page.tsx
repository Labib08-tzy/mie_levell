"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

const ORDER_TYPES = [
  { value: "DINE_IN", label: "🍽️ Makan di Tempat", desc: "Nikmati hidangan langsung di outlet" },
  { value: "TAKEAWAY", label: "🥡 Bungkus / Takeaway", desc: "Bawa pulang pesanan Anda" },
] as const;

interface UserData {
  id: number;
  nama: string;
  email: string;
  phone: string | null;
  role: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const [note, setNote] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Prefill user data
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.data) {
          const user: UserData = data.data;
          setCustomerName(user.nama);
          if (user.phone) setPhone(user.phone);
        }
      } catch {
        // User data prefill is optional
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const grandTotal = totalPrice();

  // Calculate price breakdown
  const priceBreakdown = items.reduce(
    (acc, item) => {
      const basePrice = item.product.harga * item.quantity;
      const toppingPrice = item.toppings.reduce((s, t) => s + t.harga, 0) * item.quantity;
      const spicinessPrice = item.spicinessLevel.extraHarga * item.quantity;
      acc.baseTotal += basePrice;
      acc.toppingTotal += toppingPrice;
      acc.spicinessTotal += spicinessPrice;
      return acc;
    },
    { baseTotal: 0, toppingTotal: 0, spicinessTotal: 0 }
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return; // Double-submit guard

    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        orderType,
        note: note.trim() || undefined,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          spicinessLevelId: item.spicinessLevel.id,
          toppingIds: item.toppings.map((t) => t.id),
          catatan: item.catatan || undefined,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        clearCart();
        router.push(`/order/success/${data.data.id}`);
      } else {
        setError(data.message || "Gagal membuat pesanan.");
        setShowConfirm(false);
      }
    } catch {
      setError("Gagal terhubung ke server. Silakan coba lagi.");
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, customerName, phone, orderType, note, items, clearCart, router]);

  // Client-side form validation
  function validateAndShowConfirm() {
    const errors: string[] = [];
    if (!customerName.trim() || customerName.trim().length < 2) {
      errors.push("Nama harus minimal 2 karakter.");
    }
    const cleanedPhone = phone.replace(/[\s\-()]/g, "");
    if (!cleanedPhone || !/^(\+62|62|08)\d{8,13}$/.test(cleanedPhone)) {
      errors.push("Nomor HP tidak valid (contoh: 08123456789).");
    }
    if (items.length === 0) {
      errors.push("Keranjang kosong.");
    }
    if (errors.length > 0) {
      setError(errors.join(" "));
      return;
    }
    setError("");
    setShowConfirm(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  // Empty cart guard
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
            🛒
          </div>
          <h2 className="font-bold text-slate-900 text-lg mb-2">Keranjang Kosong</h2>
          <p className="text-slate-500 text-sm mb-6">
            Tambahkan produk ke keranjang sebelum melakukan checkout.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-[14px] text-sm font-semibold transition-colors shadow-md shadow-orange-500/20"
          >
            ← Kembali ke Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-8">
      {/* Header */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              aria-label="Kembali"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="font-bold text-slate-900 text-lg">Checkout</h1>
              <p className="text-[11px] text-slate-400">Lengkapi data pesanan</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Form ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Data Pelanggan */}
            <div className="bg-white rounded-[20px] border border-slate-100 p-5 shadow-card">
              <h2 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-orange-100 text-orange-600 rounded-[10px] flex items-center justify-center text-xs font-bold">1</span>
                Data Pelanggan
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Pelanggan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="input-modern w-full px-4 py-3 border border-slate-200 rounded-[14px] text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nomor HP / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="input-modern w-full px-4 py-3 border border-slate-200 rounded-[14px] text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Metode Pemesanan */}
            <div className="bg-white rounded-[20px] border border-slate-100 p-5 shadow-card">
              <h2 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-orange-100 text-orange-600 rounded-[10px] flex items-center justify-center text-xs font-bold">2</span>
                Metode Pemesanan
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ORDER_TYPES.map((ot) => (
                  <label
                    key={ot.value}
                    className={`flex items-start gap-3 p-4 rounded-[16px] border-2 cursor-pointer transition-all ${
                      orderType === ot.value
                        ? "border-orange-500 bg-orange-50"
                        : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderType"
                      value={ot.value}
                      checked={orderType === ot.value}
                      onChange={() => setOrderType(ot.value)}
                      className="accent-orange-500 w-4 h-4 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{ot.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{ot.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Catatan Pesanan */}
            <div className="bg-white rounded-[20px] border border-slate-100 p-5 shadow-card">
              <h2 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-orange-100 text-orange-600 rounded-[10px] flex items-center justify-center text-xs font-bold">3</span>
                Catatan Pesanan
                <span className="text-slate-400 font-normal text-xs">(Opsional)</span>
              </h2>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Minta sendok plastik, pisahkan saus..."
                rows={3}
                className="w-full text-sm px-4 py-3 border border-slate-200 rounded-[14px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 resize-none bg-slate-50 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[20px] border border-slate-100 p-5 shadow-card sticky top-24">
              <h2 className="font-bold text-slate-900 text-sm mb-4">Ringkasan Pesanan</h2>

              {/* Items */}
              <div className="space-y-3 max-h-80 overflow-y-auto mb-4 pr-1">
                {items.map((item) => (
                  <div key={item.cartItemId} className="flex gap-3 pb-3 border-b border-slate-50 last:border-0">
                    <div className="relative w-12 h-12 rounded-[10px] overflow-hidden bg-slate-100 flex-shrink-0">
                      {item.product.gambarUrl ? (
                        <Image
                          src={item.product.gambarUrl}
                          alt={item.product.nama}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🍜</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-tight">{item.product.nama}</p>
                      <p className="text-[10px] text-orange-600 mt-0.5">🌶️ {item.spicinessLevel.label}</p>
                      {item.toppings.length > 0 && (
                        <p className="text-[10px] text-slate-400">+{item.toppings.map((t) => t.nama).join(", ")}</p>
                      )}
                      {item.catatan && (
                        <p className="text-[10px] text-slate-400 italic">📝 {item.catatan}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-400">{item.quantity}x</span>
                        <span className="text-xs font-bold text-slate-800">{formatRupiah(item.subtotal)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span>Subtotal Produk</span>
                  <span className="font-semibold text-slate-700">{formatRupiah(priceBreakdown.baseTotal)}</span>
                </div>
                {priceBreakdown.toppingTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Biaya Topping</span>
                    <span className="font-semibold text-slate-700">{formatRupiah(priceBreakdown.toppingTotal)}</span>
                  </div>
                )}
                {priceBreakdown.spicinessTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Ekstra Pedas</span>
                    <span className="font-semibold text-slate-700">{formatRupiah(priceBreakdown.spicinessTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Biaya Layanan</span>
                  <span className="font-semibold text-emerald-600">GRATIS</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Pembayaran</span>
                  <span className="text-orange-600 text-base">{formatRupiah(grandTotal)}</span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 rounded-[12px] bg-red-50 text-red-600 text-xs border border-red-100">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={validateAndShowConfirm}
                disabled={isSubmitting}
                className="w-full mt-4 py-3.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-[14px] shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                Lanjut ke Konfirmasi
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {showConfirm && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !isSubmitting && setShowConfirm(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="relative w-full sm:max-w-md bg-white sm:rounded-[24px] rounded-t-[24px] shadow-2xl max-h-[85dvh] overflow-y-auto">
              <div className="p-6">
                <div className="text-center mb-5">
                  <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                    📋
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">Konfirmasi Pesanan</h3>
                  <p className="text-slate-500 text-xs mt-1">Pastikan pesanan Anda sudah benar</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="bg-slate-50 rounded-[14px] p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Nama</span>
                      <span className="font-semibold text-slate-800 text-xs">{customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">No. HP</span>
                      <span className="font-semibold text-slate-800 text-xs">{phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Jenis Pesanan</span>
                      <span className="font-semibold text-slate-800 text-xs">
                        {orderType === "DINE_IN" ? "Makan di Tempat" : "Bungkus"}
                      </span>
                    </div>
                    {note && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-xs">Catatan</span>
                        <span className="font-semibold text-slate-800 text-xs text-right max-w-[60%]">{note}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-[14px] p-4">
                    <p className="text-xs font-bold text-slate-700 mb-2">Item Pesanan ({items.length})</p>
                    {items.map((item) => (
                      <div key={item.cartItemId} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800">{item.product.nama}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.spicinessLevel.label}
                            {item.toppings.length > 0 ? ` · +${item.toppings.map((t) => t.nama).join(", ")}` : ""}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-800 flex-shrink-0 ml-2">
                          {item.quantity}x {formatRupiah(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-orange-50 rounded-[14px] p-4 flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">Total Pembayaran</span>
                    <span className="font-bold text-orange-600 text-lg">{formatRupiah(grandTotal)}</span>
                  </div>
                </div>

                {/* Error in modal */}
                {error && (
                  <div className="mt-3 p-3 rounded-[12px] bg-red-50 text-red-600 text-xs border border-red-100">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isSubmitting}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-[14px] transition-colors disabled:opacity-50"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold text-sm rounded-[14px] shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Memproses...
                      </>
                    ) : (
                      "Buat Pesanan"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
