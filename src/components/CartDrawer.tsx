"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function CartDrawer() {
  const {
    isCartOpen,
    closeCart,
    items,
    removeItem,
    updateQty,
    clearCart,
    totalItems,
    totalPrice,
  } = useCartStore();

  const router = useRouter();
  const drawerRef = useRef<HTMLElement>(null);

  // Trap focus and handle Escape key
  useEffect(() => {
    if (!isCartOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isCartOpen, closeCart]);

  // Lock body scroll when open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  const itemCount = totalItems();
  const grandTotal = totalPrice();

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={closeCart}
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keranjang belanja"
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-[12px] flex items-center justify-center">
              <svg className="w-4.5 h-4.5 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Keranjang Pesanan</h3>
              <p className="text-[11px] text-slate-400">
                {itemCount === 0 ? "Belum ada item" : `${itemCount} item terpilih`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[10px] text-slate-400 hover:text-red-500 font-medium transition-colors px-2 py-1"
              >
                Hapus Semua
              </button>
            )}
            <button
              onClick={closeCart}
              className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
              aria-label="Tutup keranjang"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Items List ── */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-20">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-4xl mb-4">
                🛍️
              </div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">Keranjang Kosong</h4>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                Pilih menu favoritmu dan atur level pedas serta topping sesuai selera.
              </p>
              <button
                onClick={closeCart}
                className="mt-5 px-5 py-2.5 bg-orange-500 text-white text-xs font-semibold rounded-[12px] hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20"
              >
                Lihat Menu
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="bg-white border border-slate-100 rounded-[16px] p-3.5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {/* Image */}
                    <div className="relative w-16 h-16 rounded-[12px] overflow-hidden bg-slate-100 flex-shrink-0">
                      {item.product.gambarUrl ? (
                        <Image
                          src={item.product.gambarUrl}
                          alt={item.product.nama}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🍜</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs leading-tight">{item.product.nama}</p>
                          {/* Kustomisasi detail */}
                          <div className="mt-1 space-y-0.5">
                            <p className="text-[10px] text-orange-600 font-medium leading-tight">
                              🌶️ {item.spicinessLevel.label}
                            </p>
                            {item.toppings.length > 0 && (
                              <p className="text-[10px] text-slate-400 leading-tight">
                                +{item.toppings.map((t) => t.nama).join(", ")}
                              </p>
                            )}
                            {item.catatan && (
                              <p className="text-[10px] text-slate-400 italic leading-tight">📝 {item.catatan}</p>
                            )}
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => removeItem(item.cartItemId)}
                          className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
                          aria-label={`Hapus ${item.product.nama}`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Bottom: Qty stepper + subtotal */}
                      <div className="flex items-center justify-between mt-2.5">
                        {/* Qty Stepper */}
                        <div className="flex items-center border border-slate-200 rounded-[10px] overflow-hidden bg-slate-50 select-none">
                          <button
                            onClick={() => updateQty(item.cartItemId, -1)}
                            className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors"
                            aria-label="Kurangi"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.cartItemId, 1)}
                            className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors"
                            aria-label="Tambah"
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal */}
                        <span className="text-sm font-bold text-slate-900">
                          {formatRupiah(item.subtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer / Summary ── */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 bg-white space-y-3 flex-shrink-0 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)]">
            {/* Price breakdown */}
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span>Subtotal Produk ({itemCount} item)</span>
                <span className="font-semibold text-slate-700">{formatRupiah(grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Biaya Layanan</span>
                <span className="font-semibold text-emerald-600">GRATIS</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Pembayaran</span>
                <span className="text-orange-600 text-base">{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-sm rounded-[14px] shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
              onClick={() => {
                closeCart();
                router.push("/checkout");
              }}
            >
              <span>Konfirmasi Pesanan</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
