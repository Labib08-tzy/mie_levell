"use client";

import { useCartStore } from "@/store/cartStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NavbarProps {
  userName: string;
  userRole: string;
}

export default function Navbar({ userName, userRole }: NavbarProps) {
  const router = useRouter();
  const { openCart, totalItems } = useCartStore();
  const cartCount = totalItems();

  async function handleLogout() {
    await fetch("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">

          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 bg-orange-500 rounded-[14px] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-orange-500/20">
              M
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-slate-900 text-lg tracking-tight block leading-none">Mie Level</span>
              <span className="text-[10px] text-orange-600 font-medium">Spicy Culinary Order</span>
            </div>
          </Link>

          {/* Right Controls */}
          <div className="flex items-center gap-3 ml-auto">

            {/* Cart Button */}
            <button
              onClick={openCart}
              className="relative flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2.5 rounded-[14px] text-xs font-semibold shadow-sm transition-all"
              aria-label={`Keranjang (${cartCount} item)`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="hidden sm:inline">Keranjang</span>
              <span
                className={`bg-white text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center transition-transform ${
                  cartCount > 0 ? "scale-110" : ""
                }`}
              >
                {cartCount}
              </span>
            </button>

            {/* User Profile */}
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-[14px] px-3 py-1.5">
              <div className="w-8 h-8 bg-orange-500 rounded-[10px] flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-slate-900 text-xs font-semibold leading-tight">{userName}</p>
                <p className="text-slate-400 text-[10px]">{userRole === "ADMIN" ? "Admin" : "Member"}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 border border-slate-200 hover:border-orange-300 bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-600 px-3 py-2 rounded-[14px] text-xs font-medium transition-all"
              title="Keluar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
