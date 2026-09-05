"use client";

import Image from "next/image";
import { useCartStore, Product } from "@/store/cartStore";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

const BADGE_STYLES: Record<string, string> = {
  "Best Seller": "bg-orange-500 text-white",
  "Must Try": "bg-rose-500 text-white",
  "Favorite": "bg-amber-500 text-white",
  "Original": "bg-emerald-600 text-white",
};

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const openModal = useCartStore((s) => s.openModal);

  const badgeStyle = product.badge ? (BADGE_STYLES[product.badge] ?? "bg-slate-500 text-white") : null;

  return (
    <article className="group bg-white rounded-[20px] border border-slate-100 shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative h-40 sm:h-48 bg-slate-100 overflow-hidden">
        {product.gambarUrl ? (
          <Image
            src={product.gambarUrl}
            alt={product.nama}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🍜</div>
        )}

        {/* Badge */}
        {product.badge && badgeStyle && (
          <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${badgeStyle}`}>
            {product.badge}
          </span>
        )}

        {/* Rating */}
        <span className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
          ⭐ {product.rating}
        </span>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 gap-2">
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 text-sm leading-tight">{product.nama}</h3>
          {product.deskripsi && (
            <p className="text-[11px] text-orange-600 font-medium mt-0.5">{product.deskripsi}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="font-bold text-slate-900 text-sm">{formatRupiah(product.harga)}</span>

          <button
            onClick={() => openModal(product)}
            disabled={!product.isAvailable || product.stok === 0}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-[11px] font-semibold px-3 py-2 rounded-[10px] transition-all shadow-sm hover:shadow-orange"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {product.isAvailable && product.stok > 0 ? "Pesan" : "Habis"}
          </button>
        </div>
      </div>
    </article>
  );
}
