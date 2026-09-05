"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        router.push(data.redirect);
        router.refresh();
      } else {
        setError(data.message);
      }
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-cream-50">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 to-amber-600 relative items-center justify-center p-12 overflow-hidden">
        <div className="relative z-10 max-w-md text-white text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[20px] mx-auto flex items-center justify-center mb-6 border border-white/20">
            <span className="text-4xl">🍜</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight">Mie Level Culinary</h2>
          <p className="text-orange-100 text-sm mt-3 leading-relaxed">
            Pesan mie pedas favoritmu secara online dengan pengalaman yang cepat, mudah, dan premium.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-brand-500 rounded-[14px] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/20">
                M
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">Mie Level</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Selamat Datang</h1>
            <p className="text-slate-500 text-sm mt-1">Masuk ke akun untuk melanjutkan pesanan.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="input-modern w-full px-4 py-3 border border-slate-200 rounded-[14px] text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-modern w-full px-4 py-3 border border-slate-200 rounded-[14px] text-sm text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-[14px] text-sm font-semibold mt-2 flex items-center justify-center disabled:opacity-70"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              Belum memiliki akun?{" "}
              <Link href="/register" className="text-brand-600 font-semibold hover:text-brand-700">
                Daftar Sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
