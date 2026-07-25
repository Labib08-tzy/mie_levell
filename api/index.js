// ============================================================
// Mie Level - Main Express Application Entry Point
// Sprint 1: Authentication & Minimal User Dashboard
// ============================================================

const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const path = require("path");

const app = express();
const prisma = new PrismaClient();

// --------------- Configuration ---------------
const JWT_SECRET = process.env.JWT_SECRET || "mie-level-super-secret-key-change-in-production-2026";
const JWT_EXPIRES_IN = "7d";
const COOKIE_NAME = "mie_level_token";

// --------------- Middleware ---------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --------------- Auth Middleware ---------------
function authenticateToken(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.redirect("/login");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie(COOKIE_NAME);
    return res.redirect("/login");
  }
}

// ============================================================
//  PAGE ROUTES (Serve HTML Views)
// ============================================================

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.redirect("/dashboard");
    } catch (e) { /* token invalid, show login */ }
  }
  res.send(loginPage());
});

app.get("/register", (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.redirect("/dashboard");
    } catch (e) { /* token invalid, show register */ }
  }
  res.send(registerPage());
});

app.get("/dashboard", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      res.clearCookie(COOKIE_NAME);
      return res.redirect("/login");
    }
    res.send(dashboardPage(user));
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ============================================================
//  AUTH API ROUTES
// ============================================================

// POST /api/register
app.post("/api/register", async (req, res) => {
  try {
    const { nama, email, password, confirmPassword } = req.body;

    // --- Validation ---
    const errors = [];
    if (!nama || nama.trim().length < 2) errors.push("Nama harus minimal 2 karakter.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email tidak valid.");
    if (!password || password.length < 6) errors.push("Password harus minimal 6 karakter.");
    if (password !== confirmPassword) errors.push("Konfirmasi password tidak cocok.");

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(" ") });
    }

    // --- Check existing user ---
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email sudah terdaftar." });
    }

    // --- Hash password & create user ---
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        nama: nama.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: "USER",
      },
    });

    // --- Issue JWT ---
    const token = jwt.sign(
      { id: user.id, email: user.email, nama: user.nama, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({ success: true, message: "Registrasi berhasil!", redirect: "/dashboard" });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// POST /api/login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- Validation ---
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email dan password wajib diisi." });
    }

    // --- Find user ---
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ success: false, message: "Email atau password salah." });
    }

    // --- Verify password ---
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Email atau password salah." });
    }

    // --- Issue JWT ---
    const token = jwt.sign(
      { id: user.id, email: user.email, nama: user.nama, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, message: "Login berhasil!", redirect: "/dashboard" });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// GET /api/logout
app.get("/api/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.redirect("/login");
});

// ============================================================
//  INLINE HTML VIEW FUNCTIONS
// ============================================================

function baseHead(title) {
  return `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Mie Level - Pesan mie pedas level favoritmu secara online. Cepat, mudah, dan lezat!" />
    <title>${title} | Mie Level</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <script>
      tailwindcss.config = {
        theme: {
          extend: {
            colors: {
              brand: {
                50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
                400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
                800: '#9a3412', 900: '#7c2d12',
              },
            },
            fontFamily: {
              sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
              display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
            },
          },
        },
      }
    <\/script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif; background: #fafaf8; color: #1a1a2e; }

      .btn-primary {
        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        position: relative; overflow: hidden;
      }
      .btn-primary::after {
        content: ''; position: absolute; top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
        transition: left 0.6s;
      }
      .btn-primary:hover::after { left: 100%; }
      .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -6px rgba(249,115,22,0.4); }
      .btn-primary:active { transform: translateY(0); }

      .btn-secondary {
        background: white; border: 1.5px solid #e2e8f0; color: #334155;
        transition: all 0.2s ease;
      }
      .btn-secondary:hover { border-color: #f97316; color: #ea580c; background: #fff7ed; }

      .input-modern { transition: all 0.25s ease; background: #f8fafc; }
      .input-modern:focus {
        outline: none; border-color: #f97316;
        box-shadow: 0 0 0 4px rgba(249,115,22,0.08), 0 1px 3px rgba(0,0,0,0.06);
        background: #fff;
      }

      .card-premium {
        transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }
      .card-premium:hover {
        transform: translateY(-6px);
        box-shadow: 0 20px 40px -12px rgba(249,115,22,0.12), 0 8px 16px -8px rgba(0,0,0,0.06);
      }

      .spice-meter { display: flex; gap: 3px; }
      .spice-dot { width: 8px; height: 8px; border-radius: 50%; background: #e2e8f0; transition: all 0.3s ease; }
      .spice-dot.active { background: #f97316; }
      .spice-dot.hot { background: #ef4444; }
      .spice-dot.hell { background: #dc2626; box-shadow: 0 0 6px rgba(220,38,38,0.4); }

      .toast {
        position: fixed; top: 1.25rem; right: 1.25rem;
        padding: 1rem 1.5rem; border-radius: 1rem;
        font-weight: 600; font-size: 0.813rem; z-index: 1000;
        transform: translateX(120%);
        transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
        max-width: 380px;
        box-shadow: 0 16px 32px -8px rgba(0,0,0,0.12);
        display: flex; align-items: center; gap: 0.625rem;
      }
      .toast.show { transform: translateX(0); }
      .toast-success { background: #fff; color: #065f46; border: 1px solid #a7f3d0; }
      .toast-success::before { content: '\\2713'; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: #d1fae5; color: #065f46; border-radius: 50%; font-size: 12px; font-weight: 800; flex-shrink: 0; }
      .toast-error { background: #fff; color: #991b1b; border: 1px solid #fecaca; }
      .toast-error::before { content: '!'; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: #fee2e2; color: #991b1b; border-radius: 50%; font-size: 12px; font-weight: 800; flex-shrink: 0; }

      .spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; vertical-align: middle; }
      @keyframes spin { to { transform: rotate(360deg); } }

      @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
      @keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

      .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
      .fade-in-left { animation: fadeInLeft 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
      .animate-float { animation: float 4s ease-in-out infinite; }
      .animate-pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }
      .fade-in-up-delay-1 { animation-delay: 0.1s; opacity: 0; }
      .fade-in-up-delay-2 { animation-delay: 0.2s; opacity: 0; }
      .fade-in-up-delay-3 { animation-delay: 0.3s; opacity: 0; }
      .fade-in-up-delay-4 { animation-delay: 0.4s; opacity: 0; }

      .pattern-dots { background-image: radial-gradient(circle, rgba(249,115,22,0.12) 1px, transparent 1px); background-size: 24px 24px; }
      .stat-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }

      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    </style>
  `;
}

function noodleSVG() {
  return `
    <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-64 h-64 sm:w-80 sm:h-80 animate-float drop-shadow-xl">
      <ellipse cx="200" cy="280" rx="140" ry="40" fill="#ea580c" opacity="0.15"/>
      <path d="M80 220 C80 300, 320 300, 320 220" fill="#fff7ed" stroke="#f97316" stroke-width="3"/>
      <path d="M60 220 C60 220, 200 240, 340 220" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="200" cy="220" rx="140" ry="28" fill="#ffedd5" stroke="#f97316" stroke-width="2.5"/>
      <path d="M130 210 Q150 170, 180 200 Q210 230, 200 190 Q190 150, 220 185 Q250 220, 240 180 Q230 140, 270 190" fill="none" stroke="#fdba74" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
      <path d="M140 215 Q160 180, 190 210 Q220 240, 210 195 Q200 150, 230 190 Q260 230, 250 185" fill="none" stroke="#fed7aa" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
      <ellipse cx="160" cy="205" rx="20" ry="15" fill="#fef3c7" stroke="#fbbf24" stroke-width="2"/>
      <ellipse cx="160" cy="203" rx="8" ry="7" fill="#f59e0b"/>
      <g transform="translate(240,190) rotate(-25)"><path d="M0 0 Q10 -15, 5 -30 Q0 -20, 0 0Z" fill="#ef4444"/><path d="M5 -30 Q6 -38, 4 -35" stroke="#16a34a" stroke-width="2" fill="none" stroke-linecap="round"/></g>
      <g transform="translate(255,195) rotate(-10)"><path d="M0 0 Q8 -12, 4 -25 Q0 -16, 0 0Z" fill="#dc2626"/><path d="M4 -25 Q5 -32, 3 -29" stroke="#16a34a" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>
      <path d="M160 170 Q155 150, 165 135" stroke="#94a3b8" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.3" class="animate-pulse-soft"/>
      <path d="M200 165 Q195 140, 205 125" stroke="#94a3b8" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.25"/>
      <path d="M240 170 Q235 148, 245 132" stroke="#94a3b8" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.3"/>
      <line x1="260" y1="130" x2="180" y2="230" stroke="#9a3412" stroke-width="4" stroke-linecap="round"/>
      <line x1="275" y1="135" x2="195" y2="230" stroke="#7c2d12" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `;
}

// -------------------- LOGIN PAGE --------------------
function loginPage() {
  return `<!DOCTYPE html>
<html lang="id">
<head>${baseHead("Login")}</head>
<body class="min-h-screen antialiased">
<div class="min-h-screen flex">
  <!-- Left Panel -->
  <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-50 via-amber-50/80 to-white relative items-center justify-center overflow-hidden">
    <div class="pattern-dots absolute inset-0 opacity-40"></div>
    <div class="absolute top-20 left-16 w-32 h-32 bg-orange-200/30 rounded-full blur-2xl"></div>
    <div class="absolute bottom-32 right-20 w-48 h-48 bg-amber-200/25 rounded-full blur-3xl"></div>
    <div class="relative z-10 text-center px-12 fade-in-left">
      ${noodleSVG()}
      <div class="mt-8">
        <h2 class="font-display text-2xl font-extrabold text-slate-800">Mie Pedas Favorit Indonesia</h2>
        <p class="text-slate-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">Rasakan sensasi pedas dengan 10 tingkat level yang menantang selera dan keberanianmu!</p>
      </div>
      <div class="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-orange-100 shadow-sm max-w-xs mx-auto">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-9 h-9 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
          <div class="text-left"><p class="text-sm font-bold text-slate-800">Andi Pratama</p><p class="text-[11px] text-slate-400">Pelanggan Setia</p></div>
        </div>
        <p class="text-xs text-slate-600 leading-relaxed italic">"Mie Level 5 bener-bener bikin nagih! Pedasnya pas, bumbunya gurih. Recommended banget 🔥"</p>
        <div class="flex gap-0.5 mt-2"><i class="fas fa-star text-amber-400 text-xs"></i><i class="fas fa-star text-amber-400 text-xs"></i><i class="fas fa-star text-amber-400 text-xs"></i><i class="fas fa-star text-amber-400 text-xs"></i><i class="fas fa-star text-amber-400 text-xs"></i></div>
      </div>
    </div>
  </div>

  <!-- Right Panel: Form -->
  <div class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
    <div class="w-full max-w-md fade-in-up">
      <div class="mb-10">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-11 h-11 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20"><span class="text-xl">🍜</span></div>
          <span class="font-display text-xl font-extrabold text-slate-900 tracking-tight">Mie Level</span>
        </div>
        <h1 class="font-display text-3xl font-extrabold text-slate-900 tracking-tight">Selamat Datang! 👋</h1>
        <p class="text-slate-500 text-sm mt-2">Masuk ke akun untuk melanjutkan pesanan mie favoritmu.</p>
      </div>

      <form id="loginForm" class="space-y-5">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2" for="email">Email</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><i class="far fa-envelope text-sm"></i></span>
            <input type="email" id="email" name="email" required autocomplete="email" placeholder="nama@email.com" class="input-modern w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2" for="password">Password</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><i class="fas fa-lock text-sm"></i></span>
            <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="••••••••" class="input-modern w-full pl-11 pr-12 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm" />
            <button type="button" onclick="togglePassword('password', this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" aria-label="Toggle password visibility"><i class="far fa-eye eye-icon text-sm"></i></button>
          </div>
        </div>
        <button type="submit" id="loginBtn" class="btn-primary w-full py-3.5 text-white font-bold rounded-xl text-sm shadow-lg mt-1 flex items-center justify-center gap-2"><span>Masuk ke Akun</span><i class="fas fa-arrow-right text-xs"></i></button>
      </form>

      <div class="mt-8 text-center">
        <p class="text-slate-500 text-sm">Belum memiliki akun? <a href="/register" class="text-orange-600 font-semibold hover:text-orange-700 transition-colors ml-1">Daftar Sekarang</a></p>
      </div>
      <p class="text-center text-slate-400 text-xs mt-10">&copy; 2026 Mie Level. All rights reserved.</p>
    </div>
  </div>
</div>

<div id="toast" class="toast" role="alert"></div>
<script>
function showToast(msg, type='error') {
  const t = document.getElementById('toast');
  t.className = 'toast toast-' + type + ' show';
  t.innerHTML = '<span>' + msg + '</span>';
  setTimeout(() => t.classList.remove('show'), 4000);
}
function togglePassword(id, btn) {
  const inp = document.getElementById(id);
  const ico = btn.querySelector('.eye-icon');
  if (inp.type === 'password') { inp.type = 'text'; ico.className = 'far fa-eye-slash eye-icon text-sm'; }
  else { inp.type = 'password'; ico.className = 'far fa-eye eye-icon text-sm'; }
}
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> <span>Memproses...</span>';
  btn.disabled = true; btn.style.opacity = '0.8';
  try {
    const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('password').value }) });
    const data = await res.json();
    if (data.success) { showToast(data.message, 'success'); setTimeout(() => window.location.href = data.redirect, 600); }
    else { showToast(data.message, 'error'); btn.innerHTML = orig; btn.disabled = false; btn.style.opacity = '1'; }
  } catch { showToast('Gagal terhubung ke server.', 'error'); btn.innerHTML = orig; btn.disabled = false; btn.style.opacity = '1'; }
});
<\/script>
</body></html>`;
}

// -------------------- REGISTER PAGE --------------------
function registerPage() {
  return `<!DOCTYPE html>
<html lang="id">
<head>${baseHead("Daftar")}</head>
<body class="min-h-screen antialiased">
<div class="min-h-screen flex">
  <!-- Left Panel -->
  <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-50 via-orange-50/60 to-white relative items-center justify-center overflow-hidden">
    <div class="pattern-dots absolute inset-0 opacity-40"></div>
    <div class="absolute top-32 right-20 w-40 h-40 bg-orange-200/25 rounded-full blur-3xl"></div>
    <div class="absolute bottom-20 left-16 w-36 h-36 bg-amber-200/30 rounded-full blur-2xl"></div>
    <div class="relative z-10 text-center px-12 fade-in-left">
      ${noodleSVG()}
      <div class="mt-8">
        <h2 class="font-display text-2xl font-extrabold text-slate-800">Gabung Keluarga Mie Level!</h2>
        <p class="text-slate-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">Daftar sekarang dan dapatkan akses ke menu mie pedas eksklusif dengan berbagai tingkat level.</p>
      </div>
      <div class="flex items-center justify-center gap-4 mt-8">
        <div class="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-orange-100 shadow-sm text-center"><p class="text-xl font-extrabold text-orange-600">1.2K+</p><p class="text-[11px] text-slate-500 font-medium">Pelanggan</p></div>
        <div class="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-orange-100 shadow-sm text-center"><p class="text-xl font-extrabold text-amber-600">4.9</p><p class="text-[11px] text-slate-500 font-medium">Rating ⭐</p></div>
        <div class="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-orange-100 shadow-sm text-center"><p class="text-xl font-extrabold text-rose-600">10</p><p class="text-[11px] text-slate-500 font-medium">Level Pedas</p></div>
      </div>
    </div>
  </div>

  <!-- Right Panel: Form -->
  <div class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
    <div class="w-full max-w-md fade-in-up">
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-11 h-11 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20"><span class="text-xl">🍜</span></div>
          <span class="font-display text-xl font-extrabold text-slate-900 tracking-tight">Mie Level</span>
        </div>
        <h1 class="font-display text-3xl font-extrabold text-slate-900 tracking-tight">Buat Akun Baru 🎉</h1>
        <p class="text-slate-500 text-sm mt-2">Lengkapi data di bawah untuk mulai memesan.</p>
      </div>

      <form id="registerForm" class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2" for="nama">Nama Lengkap</label>
          <div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><i class="far fa-user text-sm"></i></span><input type="text" id="nama" name="nama" required autocomplete="name" placeholder="Masukkan nama lengkap" class="input-modern w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm" /></div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2" for="email">Email</label>
          <div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><i class="far fa-envelope text-sm"></i></span><input type="email" id="email" name="email" required autocomplete="email" placeholder="nama@email.com" class="input-modern w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm" /></div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2" for="password">Password</label>
          <div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><i class="fas fa-lock text-sm"></i></span><input type="password" id="password" name="password" required autocomplete="new-password" placeholder="Minimal 6 karakter" class="input-modern w-full pl-11 pr-12 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm" /><button type="button" onclick="togglePassword('password', this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" aria-label="Toggle"><i class="far fa-eye eye-icon text-sm"></i></button></div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2" for="confirmPassword">Konfirmasi Password</label>
          <div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><i class="fas fa-lock text-sm"></i></span><input type="password" id="confirmPassword" name="confirmPassword" required autocomplete="new-password" placeholder="Ulangi password" class="input-modern w-full pl-11 pr-12 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm" /><button type="button" onclick="togglePassword('confirmPassword', this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" aria-label="Toggle"><i class="far fa-eye eye-icon text-sm"></i></button></div>
        </div>
        <button type="submit" id="registerBtn" class="btn-primary w-full py-3.5 text-white font-bold rounded-xl text-sm shadow-lg mt-1 flex items-center justify-center gap-2"><span>Daftar Sekarang</span><i class="fas fa-arrow-right text-xs"></i></button>
      </form>

      <div class="mt-8 text-center"><p class="text-slate-500 text-sm">Sudah memiliki akun? <a href="/login" class="text-orange-600 font-semibold hover:text-orange-700 transition-colors ml-1">Masuk di sini</a></p></div>
      <p class="text-center text-slate-400 text-xs mt-8">&copy; 2026 Mie Level. All rights reserved.</p>
    </div>
  </div>
</div>

<div id="toast" class="toast" role="alert"></div>
<script>
function showToast(msg, type='error') {
  const t = document.getElementById('toast');
  t.className = 'toast toast-' + type + ' show';
  t.innerHTML = '<span>' + msg + '</span>';
  setTimeout(() => t.classList.remove('show'), 4000);
}
function togglePassword(id, btn) {
  const inp = document.getElementById(id);
  const ico = btn.querySelector('.eye-icon');
  if (inp.type === 'password') { inp.type = 'text'; ico.className = 'far fa-eye-slash eye-icon text-sm'; }
  else { inp.type = 'password'; ico.className = 'far fa-eye eye-icon text-sm'; }
}
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> <span>Memproses...</span>';
  btn.disabled = true; btn.style.opacity = '0.8';
  try {
    const res = await fetch('/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nama: document.getElementById('nama').value, email: document.getElementById('email').value, password: document.getElementById('password').value, confirmPassword: document.getElementById('confirmPassword').value }) });
    const data = await res.json();
    if (data.success) { showToast(data.message, 'success'); setTimeout(() => window.location.href = data.redirect, 600); }
    else { showToast(data.message, 'error'); btn.innerHTML = orig; btn.disabled = false; btn.style.opacity = '1'; }
  } catch { showToast('Gagal terhubung ke server.', 'error'); btn.innerHTML = orig; btn.disabled = false; btn.style.opacity = '1'; }
});
<\/script>
</body></html>`;
}

// -------------------- DASHBOARD PAGE --------------------
function dashboardPage(user) {
  const products = [
    { name:"Mie Level 1", subtitle:"Pedas Manis", desc:"Perpaduan rasa manis dan pedas yang pas untuk pemula. Gurih dengan aroma rempah pilihan.", price:"15.000", spiceLevel:1, badgeLabel:"Pemula", badgeColor:"bg-amber-100 text-amber-800", cardAccent:"from-amber-400 to-orange-400", emoji:"🍜", image:"" },
    { name:"Mie Level 3", subtitle:"Pedas Nampol", desc:"Tingkat pedas sedang yang bikin ketagihan! Bumbu cabai asli dengan tekstur mie kenyal.", price:"18.000", spiceLevel:3, badgeLabel:"Sedang", badgeColor:"bg-orange-100 text-orange-800", cardAccent:"from-orange-400 to-orange-500", emoji:"🍝", image:"" },
    { name:"Mie Level 5", subtitle:"Pedas Gila", desc:"Sensasi pedas membakar untuk pecinta tantangan! Lezat dan meledak di mulut.", price:"22.000", spiceLevel:5, badgeLabel:"Pedas", badgeColor:"bg-rose-100 text-rose-800", cardAccent:"from-rose-400 to-red-500", emoji:"🔥", image:"" },
    { name:"Mie Level 10", subtitle:"Level Neraka", desc:"Tingkat kepedasan TERTINGGI! Racikan cabai rawit super murni. Khusus penikmat sejati!", price:"28.000", spiceLevel:10, badgeLabel:"Extreme", badgeColor:"bg-red-100 text-red-900", cardAccent:"from-red-500 to-red-700", emoji:"💀", image:"" },
  ];

  function renderSpiceDots(level) {
    let dots = '';
    for (let i = 1; i <= 10; i++) {
      let cls = 'spice-dot';
      if (i <= level) { if (level >= 8) cls += ' hell'; else if (level >= 4) cls += ' hot'; else cls += ' active'; }
      dots += '<div class="' + cls + '"></div>';
    }
    return dots;
  }

  const productCards = products.map((p, i) => `
    <div class="card-premium bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col fade-in-up fade-in-up-delay-${i + 1}">
      <div class="relative h-48 bg-gradient-to-br ${p.cardAccent} flex items-center justify-center overflow-hidden">
        <div class="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
        <div class="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-6 -translate-x-6"></div>
        ${p.image ? '<img src="'+p.image+'" alt="'+p.name+'" class="w-full h-full object-cover"/>' : '<span class="text-7xl filter drop-shadow-lg relative z-10">'+p.emoji+'</span>'}
        <div class="absolute top-3 left-3 ${p.badgeColor} px-3 py-1 rounded-full text-[11px] font-bold shadow-sm">${p.badgeLabel}</div>
      </div>
      <div class="p-5 flex-1 flex flex-col">
        <div class="flex-1">
          <h3 class="font-display text-base font-extrabold text-slate-900">${p.name}</h3>
          <p class="text-orange-600 text-xs font-semibold mb-2">${p.subtitle}</p>
          <p class="text-slate-500 text-xs leading-relaxed mb-3">${p.desc}</p>
          <div class="flex items-center gap-2 mb-4"><span class="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Pedas</span><div class="spice-meter">${renderSpiceDots(p.spiceLevel)}</div></div>
        </div>
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div><span class="text-[10px] text-slate-400 font-semibold">IDR</span><span class="font-display text-lg font-extrabold text-slate-900 ml-0.5">${p.price}</span></div>
          <button class="btn-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"><i class="fas fa-plus text-[10px]"></i> Pesan</button>
        </div>
      </div>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>${baseHead("Dashboard")}</head>
<body class="min-h-screen text-slate-900 antialiased" style="background:#fafaf8">

<!-- Navigation -->
<nav class="sticky top-0 z-50 bg-white/85 backdrop-blur-lg border-b border-slate-200/70">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20"><span class="text-lg">🍜</span></div>
        <div><span class="font-display text-lg font-extrabold text-slate-900 tracking-tight block leading-tight">Mie Level</span><span class="text-[10px] text-slate-400 font-medium block leading-tight">Specialty Spicy Noodle</span></div>
      </div>
      <div class="flex items-center gap-3">
        <div class="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
          <div class="w-8 h-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm">${user.nama.charAt(0).toUpperCase()}</div>
          <div><p class="text-slate-900 text-xs font-bold leading-tight">${user.nama}</p><p class="text-slate-400 text-[10px] font-medium">${user.role === 'ADMIN' ? '🛡️ Admin' : '👤 Member'}</p></div>
        </div>
        <a href="/api/logout" id="logoutBtn" class="btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"><i class="fas fa-sign-out-alt text-xs"></i><span class="hidden sm:inline">Keluar</span></a>
      </div>
    </div>
  </div>
</nav>

<!-- Hero -->
<section class="relative overflow-hidden">
  <div class="absolute inset-0 bg-gradient-to-br from-orange-50/80 via-amber-50/40 to-transparent"></div>
  <div class="absolute top-10 right-10 w-72 h-72 bg-orange-200/20 rounded-full blur-3xl"></div>
  <div class="absolute bottom-0 left-0 w-96 h-48 bg-amber-100/15 rounded-full blur-3xl"></div>
  <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
      <div class="fade-in-up">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100/80 border border-orange-200 rounded-full text-orange-800 text-xs font-bold mb-4"><span class="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span> Selamat Datang</div>
        <h1 class="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">Halo, <span class="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">${user.nama}</span>! 🔥</h1>
        <p class="text-slate-600 mt-2 text-sm sm:text-base max-w-lg leading-relaxed">Pilih tingkat kepedasan favoritmu dan nikmati sensasi mie yang menggugah selera hari ini.</p>
      </div>
      <div class="fade-in-up fade-in-up-delay-1 flex-shrink-0"><a href="#menu" class="btn-primary inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl text-sm shadow-lg"><i class="fas fa-utensils"></i> Lihat Menu</a></div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 fade-in-up fade-in-up-delay-2">
      <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3"><div class="stat-icon bg-orange-50 text-orange-600"><i class="fas fa-bowl-food"></i></div><div><p class="text-xl font-extrabold text-slate-900 font-display leading-tight">4</p><p class="text-slate-500 text-[11px] font-medium">Menu Spesial</p></div></div>
      <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3"><div class="stat-icon bg-rose-50 text-rose-600"><i class="fas fa-pepper-hot"></i></div><div><p class="text-xl font-extrabold text-slate-900 font-display leading-tight">10</p><p class="text-slate-500 text-[11px] font-medium">Tingkat Pedas</p></div></div>
      <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3"><div class="stat-icon bg-blue-50 text-blue-600"><i class="fas fa-receipt"></i></div><div><p class="text-xl font-extrabold text-slate-900 font-display leading-tight">0</p><p class="text-slate-500 text-[11px] font-medium">Pesanan Aktif</p></div></div>
      <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3"><div class="stat-icon bg-amber-50 text-amber-600"><i class="fas fa-star"></i></div><div><p class="text-xl font-extrabold text-slate-900 font-display leading-tight">New</p><p class="text-slate-500 text-[11px] font-medium">Member</p></div></div>
    </div>
  </div>
</section>

<!-- Menu -->
<section id="menu" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
    <div class="fade-in-up">
      <p class="text-orange-600 text-xs font-bold uppercase tracking-widest mb-1">Our Menu</p>
      <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">Menu Mie Level 🍜</h2>
      <p class="text-slate-500 text-sm mt-1">Pilih tingkat kepedasan sesuai selera dan keberanianmu</p>
    </div>
    <div class="hidden sm:flex items-center gap-2">
      <button class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"><i class="fas fa-fire text-orange-500 text-xs"></i> Terpopuler</button>
      <button class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"><i class="fas fa-sort-amount-up text-slate-400 text-xs"></i> Harga</button>
    </div>
  </div>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${productCards}</div>
</section>

<!-- CTA Banner -->
<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
  <div class="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 sm:p-12 relative overflow-hidden fade-in-up">
    <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
    <div class="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>
    <div class="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
      <div><h3 class="font-display text-2xl font-extrabold text-white">Tantang Dirimu! 🔥</h3><p class="text-orange-100 text-sm mt-1 max-w-md">Sudah siap naik ke level berikutnya? Coba Mie Level 10 - Level Neraka dan buktikan keberanianmu!</p></div>
      <button class="flex-shrink-0 bg-white text-orange-700 font-bold px-6 py-3 rounded-xl text-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">Pesan Level 10 💀</button>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="border-t border-slate-100 bg-white py-8 mt-4">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2.5"><div class="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center"><span class="text-sm">🍜</span></div><span class="font-display text-sm font-bold text-slate-800">Mie Level</span></div>
      <div class="flex items-center gap-6 text-xs text-slate-400"><span>&copy; 2026 Mie Level</span><span class="hidden sm:inline">&bull;</span><span class="hidden sm:inline">Made with 🔥 in Indonesia</span></div>
    </div>
  </div>
</footer>

</body></html>`;
}

// ============================================================
//  START SERVER (Local Dev)
// ============================================================
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🍜 Mie Level server running at http://localhost:${PORT}`);
    console.log(`   → Login:     http://localhost:${PORT}/login`);
    console.log(`   → Register:  http://localhost:${PORT}/register`);
    console.log(`   → Dashboard: http://localhost:${PORT}/dashboard\n`);
  });
}

// Export for Vercel serverless
module.exports = app;
