"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useCartStore, SpicinessLevel, Topping } from "@/store/cartStore";

const CHILI_ICONS = ["😊", "🌶️", "🌶️🌶️", "🌶️🌶️🌶️", "🔥🔥", "💀🔥"];

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function MenuModal() {
  const { isModalOpen, selectedProduct, closeModal, addItem, spicinessLevels, toppings } = useCartStore();

  const [selectedSpiciness, setSelectedSpiciness] = useState<SpicinessLevel | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [catatan, setCatatan] = useState("");

  // Reset state when modal opens with new product
  useEffect(() => {
    if (isModalOpen && spicinessLevels.length > 0) {
      setSelectedSpiciness(spicinessLevels[0]);
      setSelectedToppings([]);
      setQuantity(1);
      setCatatan("");
    }
  }, [isModalOpen, spicinessLevels]);

  const toggleTopping = useCallback((topping: Topping) => {
    setSelectedToppings((prev) =>
      prev.find((t) => t.id === topping.id)
        ? prev.filter((t) => t.id !== topping.id)
        : [...prev, topping]
    );
  }, []);

  if (!isModalOpen || !selectedProduct) return null;

  const toppingTotal = selectedToppings.reduce((s, t) => s + t.harga, 0);
  const spicinessExtra = selectedSpiciness?.extraHarga ?? 0;
  const unitPrice = selectedProduct.harga + toppingTotal + spicinessExtra;
  const totalPrice = unitPrice * quantity;

  function handleAddToCart() {
    if (!selectedSpiciness) return;
    addItem({ product: selectedProduct!, quantity, spicinessLevel: selectedSpiciness, toppings: selectedToppings, catatan });
  }

  const badgeColor =
    selectedProduct.badge === "Best Seller"
      ? "bg-orange-500 text-white"
      : selectedProduct.badge === "Must Try"
      ? "bg-rose-500 text-white"
      : selectedProduct.badge === "Favorite"
      ? "bg-amber-500 text-white"
      : "bg-emerald-600 text-white";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <div className="relative w-full sm:max-w-lg bg-white sm:rounded-[24px] rounded-t-[24px] shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kustomisasi Pesanan</span>
            <button
              onClick={closeModal}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              aria-label="Tutup modal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Product Image */}
            <div className="relative h-52 w-full bg-slate-100 flex-shrink-0">
              {selectedProduct.gambarUrl ? (
                <Image
                  src={selectedProduct.gambarUrl}
                  alt={selectedProduct.nama}
                  fill
                  className="object-cover"
                  sizes="(max-width: 512px) 100vw, 512px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🍜</div>
              )}
              {/* Badge */}
              {selectedProduct.badge && (
                <span className={`absolute top-3 left-3 text-[10px] font-bold px-3 py-1 rounded-full ${badgeColor}`}>
                  {selectedProduct.badge}
                </span>
              )}
              {/* Rating */}
              <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-slate-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                ⭐ {selectedProduct.rating}
              </span>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Product Info */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="modal-title" className="font-bold text-slate-900 text-lg leading-tight">{selectedProduct.nama}</h2>
                  {selectedProduct.deskripsi && (
                    <p className="text-xs text-orange-600 font-medium mt-0.5">{selectedProduct.deskripsi}</p>
                  )}
                </div>
                <span className="text-lg font-bold text-orange-600 flex-shrink-0">{formatRupiah(selectedProduct.harga)}</span>
              </div>

              {/* ── Spiciness Level ── */}
              {spicinessLevels.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900">
                      Tingkat Kepedasan <span className="text-red-500">*</span>
                    </label>
                    {selectedSpiciness && (
                      <span className="text-xs font-semibold text-orange-600">{selectedSpiciness.label}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {spicinessLevels.map((sl) => (
                      <label
                        key={sl.id}
                        className={`flex items-center gap-3 p-3 rounded-[14px] border cursor-pointer transition-all ${
                          selectedSpiciness?.id === sl.id
                            ? "border-orange-500 bg-orange-50"
                            : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="spiciness"
                          value={sl.id}
                          checked={selectedSpiciness?.id === sl.id}
                          onChange={() => setSelectedSpiciness(sl)}
                          className="accent-orange-500 w-4 h-4 flex-shrink-0"
                        />
                        <span className="text-base">{CHILI_ICONS[sl.level] ?? "🌶️"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 leading-tight">{sl.label}</p>
                          {sl.deskripsi && <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{sl.deskripsi}</p>}
                        </div>
                        {sl.extraHarga > 0 && (
                          <span className="text-[10px] font-bold text-orange-600 flex-shrink-0">+{formatRupiah(sl.extraHarga)}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Toppings ── */}
              {toppings.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-900">
                    Topping Tambahan{" "}
                    <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {toppings.map((tp) => (
                      <label
                        key={tp.id}
                        className={`flex items-center gap-3 p-3 rounded-[14px] border cursor-pointer transition-all ${
                          selectedToppings.find((t) => t.id === tp.id)
                            ? "border-orange-500 bg-orange-50"
                            : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedToppings.find((t) => t.id === tp.id)}
                          onChange={() => toggleTopping(tp)}
                          className="accent-orange-500 w-4 h-4 flex-shrink-0 rounded"
                        />
                        <span className="flex-1 text-xs font-semibold text-slate-800">{tp.nama}</span>
                        <span className="text-xs font-bold text-orange-600 flex-shrink-0">+{formatRupiah(tp.harga)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Catatan ── */}
              <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-900 block mb-2">Catatan (Opsional)</label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Tidak pakai kecap, ekstra saus..."
                  rows={2}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-[12px] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 resize-none bg-slate-50 focus:bg-white transition-all"
                />
              </div>

              {/* Bottom padding */}
              <div className="h-2" />
            </div>
          </div>

          {/* ── Sticky Bottom Bar ── */}
          <div className="px-5 py-4 border-t border-slate-100 bg-white space-y-3 flex-shrink-0 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)]">
            {/* Quantity + Total */}
            <div className="flex items-center justify-between gap-4">
              {/* Stepper */}
              <div className="flex items-center border border-slate-200 rounded-[14px] overflow-hidden bg-slate-50 select-none">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-lg font-bold transition-colors"
                  aria-label="Kurangi jumlah"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-bold text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-lg font-bold transition-colors"
                  aria-label="Tambah jumlah"
                >
                  +
                </button>
              </div>

              {/* Total */}
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Total</p>
                <p className="text-base font-bold text-orange-600">{formatRupiah(totalPrice)}</p>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={!selectedSpiciness}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-[14px] shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Tambah ke Keranjang · {formatRupiah(totalPrice)}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-up {
          animation: slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (min-width: 640px) {
          .animate-slide-up {
            animation: fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        }
      `}</style>
    </>
  );
}
