"use client";

import { useState, useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/store/cartStore";

interface Category {
  id: number;
  nama: string;
  icon: string | null;
}

interface CategoryTabsProps {
  categories: Category[];
  products: Product[];
}

export default function CategoryTabs({ categories, products }: CategoryTabsProps) {
  const [activeCategory, setActiveCategory] = useState<number | null>(null); // null = semua
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== null) list = list.filter((p) => p.categoryId === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.nama.toLowerCase().includes(q) || p.deskripsi?.toLowerCase().includes(q));
    }
    if (sort === "price-asc") list = [...list].sort((a, b) => a.harga - b.harga);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.harga - a.harga);
    if (sort === "name") list = [...list].sort((a, b) => a.nama.localeCompare(b.nama));
    return list;
  }, [products, activeCategory, search, sort]);

  return (
    <section id="menuSection" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-bold text-2xl text-slate-900">Daftar Menu Spesial</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Pilih hidangan favoritmu dan atur tingkat kepedasan & topping
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama menu..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-[14px] focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-sm transition-all"
            />
          </div>
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-white border border-slate-200 rounded-[14px] px-3.5 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-orange-500 shadow-sm"
          >
            <option value="default">Urutan Default</option>
            <option value="price-asc">Harga: Terrendah</option>
            <option value="price-desc">Harga: Tertinggi</option>
            <option value="name">Nama Menu A–Z</option>
          </select>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 mb-6 scrollbar-hide flex-nowrap whitespace-nowrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-all flex-shrink-0 ${
            activeCategory === null
              ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
              : "bg-white border border-slate-200 text-slate-700 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50"
          }`}
        >
          <span>🍽️</span>
          <span>Semua Menu</span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-all flex-shrink-0 ${
              activeCategory === cat.id
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                : "bg-white border border-slate-200 text-slate-700 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50"
            }`}
          >
            {cat.icon && <span>{cat.icon}</span>}
            <span>{cat.nama}</span>
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-[20px] border border-slate-200 shadow-sm mt-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
            🔍
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Menu Tidak Ditemukan</h3>
          <p className="text-slate-500 text-xs mt-1">Coba kata kunci atau kategori lain.</p>
          <button
            onClick={() => { setSearch(""); setActiveCategory(null); setSort("default"); }}
            className="mt-4 px-4 py-2 border border-slate-200 hover:border-orange-300 hover:text-orange-600 rounded-[12px] text-xs font-semibold transition-colors"
          >
            Reset Filter
          </button>
        </div>
      )}
    </section>
  );
}
