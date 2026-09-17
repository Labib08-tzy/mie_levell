"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import CategoryTabs from "@/components/CategoryTabs";
import MenuModal from "@/components/MenuModal";
import CartDrawer from "@/components/CartDrawer";
import { useCartStore } from "@/store/cartStore";

// JWT decode is handled server-side normally, but for client-side hydration display, we use a simple fetch:
export default function DashboardPage() {
  const [user, setUser] = useState<{ nama: string; role: string }>({ nama: "User", role: "Member" });
  const [data, setData] = useState<{ categories: any[]; products: any[] }>({ categories: [], products: [] });
  const [loading, setLoading] = useState(true);

  const { setSpicinessLevels, setToppings } = useCartStore();

  useEffect(() => {
    // We fetch everything in parallel on mount
    async function loadData() {
      try {
        const [userRes, prodsRes, catsRes, spiceRes, toppingsRes] = await Promise.all([
          fetch("/api/auth/me").then((r) => r.json()).then((res) => {
            if (res.success) return res.data;
            return { nama: "User", role: "Member" };
          }),
          fetch("/api/products").then((r) => r.json()),
          fetch("/api/categories").then((r) => r.json()),
          fetch("/api/spiciness-levels").then((r) => r.json()),
          fetch("/api/toppings").then((r) => r.json()),
        ]);

        setUser(userRes);
        if (prodsRes.success && catsRes.success) {
          setData({ products: prodsRes.data, categories: catsRes.data });
        }
        if (spiceRes.success) setSpicinessLevels(spiceRes.data);
        if (toppingsRes.success) setToppings(toppingsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [setSpicinessLevels, setToppings]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat data...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 relative">
      <Navbar userName={user.nama} userRole={user.role} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="bg-white rounded-[24px] border border-slate-100 p-6 sm:p-10 shadow-card overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Content */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center px-3.5 py-1 bg-brand-50 border border-brand-100 rounded-full text-brand-600 text-xs font-semibold">
                  Kuliner Mie Pedas
                </div>
                <div>
                  <p className="text-slate-500 text-base font-medium">Selamat Datang Kembali,</p>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mt-1">
                    {user.nama}
                  </h1>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
                  Nikmati mie pedas dengan cita rasa terbaik. Pilih menu favoritmu dan atur level pedas sesuai selera.
                </p>
                <div className="flex gap-3 pt-2">
                  <a href="#menuSection" className="btn-primary px-6 py-3.5 rounded-[16px] text-xs font-semibold shadow-md flex items-center gap-2">
                    Pesan Sekarang
                  </a>
                </div>
              </div>

              {/* Hero Image */}
              <div className="lg:col-span-5">
                <div className="relative h-72 sm:h-96 w-full rounded-[20px] overflow-hidden shadow-lg border border-slate-100 group">
                  <Image
                    src="/image/mie_gacoan.png"
                    alt="Mie Pedas Hero"
                    fill
                    className="object-cover transform group-hover:scale-105 transition duration-700"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3.5 rounded-[16px] border border-white/40 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Mie Gacor Original</p>
                      <p className="text-[11px] text-brand-600 font-semibold">Menu Terpopuler Hari Ini</p>
                    </div>
                    <span className="text-xs font-bold text-slate-900 bg-brand-50 px-2.5 py-1 rounded-full text-brand-600">Rp 14.000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Menu & Categories */}
        <CategoryTabs categories={data.categories} products={data.products} />
      </main>

      {/* Global Modals/Drawers controlled by Zustand */}
      <MenuModal />
      <CartDrawer />
    </div>
  );
}
