// ============================================================
// Mie Level - Main Express Application Entry Point
// Redesigned: Modern, Premium Food Ordering Experience
// Inspired by Apple, Stripe, Linear, & GrabFood Aesthetics
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

// Serve static assets (images, stylesheets, icons)
app.use("/public", express.static(path.join(__dirname, "../public")));
app.use(express.static(path.join(__dirname, "../public")));

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
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
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
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
//  INLINE HTML VIEW FUNCTIONS & STYLES
// ============================================================

function baseHead(title) {
  return `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Mie Level - Premium Spicy Noodle Ordering Experience" />
    <title>${title} | Mie Level</title>
    <script src="https://cdn.tailwindcss.com"></script>
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
              cream: {
                50: '#fffbf7', 100: '#faf8f5', 200: '#f5f0eb',
              }
            },
            fontFamily: {
              sans: ['Poppins', 'system-ui', 'sans-serif'],
              display: ['Poppins', 'sans-serif'],
            },
            borderRadius: {
              '20': '20px',
              '24': '24px',
            }
          },
        },
      }
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Poppins', system-ui, sans-serif; background: #FFFBF7; color: #1e293b; -webkit-font-smoothing: antialiased; }

      .btn-primary {
        background: #f97316;
        color: #ffffff;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .btn-primary:hover {
        background: #ea580c;
        transform: scale(1.02);
        box-shadow: 0 10px 20px -5px rgba(249, 115, 22, 0.35);
      }
      .btn-primary:active { transform: scale(0.98); }

      .btn-secondary {
        background: #ffffff;
        border: 1.5px solid #e2e8f0;
        color: #334155;
        transition: all 0.25s ease;
      }
      .btn-secondary:hover {
        border-color: #f97316;
        color: #f97316;
        background: #fff7ed;
        transform: scale(1.02);
      }
      .btn-secondary:active { transform: scale(0.98); }

      .input-modern { transition: all 0.25s ease; background: #f8fafc; }
      .input-modern:focus {
        outline: none; border-color: #f97316;
        box-shadow: 0 0 0 4px rgba(249,115,22,0.1);
        background: #ffffff;
      }

      .card-premium {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 20px;
        background: #ffffff;
        box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.04);
      }
      .card-premium:hover {
        transform: translateY(-6px);
        box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.08);
      }

      .detail-drawer {
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .detail-drawer.open {
        transform: translateX(0);
      }

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
      .toast-success { background: #ffffff; color: #065f46; border: 1px solid #a7f3d0; }
      .toast-error { background: #ffffff; color: #991b1b; border: 1px solid #fecaca; }

      .spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; vertical-align: middle; }
      @keyframes spin { to { transform: rotate(360deg); } }

      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    </style>
  `;
}

// -------------------- LOGIN PAGE --------------------
function loginPage() {
  return `<!DOCTYPE html>
<html lang="id">
<head>${baseHead("Login")}</head>
<body class="min-h-screen antialiased bg-[#FFFBF7]">
<div class="min-h-screen flex">
  <!-- Left Panel: Minimalist Food Showcase -->
  <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-amber-600 relative items-center justify-center p-12 overflow-hidden">
    <div class="relative z-10 max-w-md text-white text-center">
      <div class="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[20px] mx-auto flex items-center justify-center mb-6 border border-white/20">
        <i class="fas fa-utensils text-3xl text-white"></i>
      </div>
      <h2 class="font-display text-3xl font-bold leading-tight">Mie Level Culinary</h2>
      <p class="text-orange-100 text-sm mt-3 leading-relaxed">Pesan mie pedas favoritmu secara online dengan pengalaman yang cepat, mudah, dan premium.</p>
    </div>
  </div>

  <!-- Right Panel: Login Form -->
  <div class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
    <div class="w-full max-w-md">
      <div class="mb-10">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-10 h-10 bg-orange-500 rounded-[14px] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-orange-500/20">
            M
          </div>
          <span class="font-display text-xl font-bold text-slate-900 tracking-tight">Mie Level</span>
        </div>
        <h1 class="font-display text-2xl font-bold text-slate-900">Selamat Datang</h1>
        <p class="text-slate-500 text-sm mt-1">Masuk ke akun untuk melanjutkan pesanan.</p>
      </div>

      <form id="loginForm" class="space-y-5">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-2" for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="nama@email.com" class="input-modern w-full px-4 py-3 border border-slate-200 rounded-[14px] text-slate-900 placeholder-slate-400 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-2" for="password">Password</label>
          <div class="relative">
            <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="••••••••" class="input-modern w-full px-4 py-3 border border-slate-200 rounded-[14px] text-slate-900 placeholder-slate-400 text-sm" />
            <button type="button" onclick="togglePassword('password', this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" aria-label="Toggle password visibility"><i class="far fa-eye eye-icon text-sm"></i></button>
          </div>
        </div>
        <button type="submit" id="loginBtn" class="btn-primary w-full py-3.5 font-semibold rounded-[14px] text-sm shadow-md mt-1 flex items-center justify-center gap-2"><span>Masuk</span><i class="fas fa-arrow-right text-xs"></i></button>
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
</script>
</body></html>`;
}

// -------------------- REGISTER PAGE --------------------
function registerPage() {
  return `<!DOCTYPE html>
<html lang="id">
<head>${baseHead("Daftar")}</head>
<body class="min-h-screen antialiased bg-[#FFFBF7]">
<div class="min-h-screen flex">
  <!-- Left Panel Showcase -->
  <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-600 to-orange-600 relative items-center justify-center p-12 overflow-hidden">
    <div class="relative z-10 max-w-md text-white text-center">
      <div class="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[20px] mx-auto flex items-center justify-center mb-6 border border-white/20">
        <i class="fas fa-fire text-3xl text-white"></i>
      </div>
      <h2 class="font-display text-3xl font-bold leading-tight">Bergabung dengan Mie Level</h2>
      <p class="text-orange-100 text-sm mt-3 leading-relaxed">Nikmati kemudahan pesan antar hidangan mie pedas favoritmu secara praktis.</p>
    </div>
  </div>

  <!-- Right Panel: Register Form -->
  <div class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
    <div class="w-full max-w-md">
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-10 h-10 bg-orange-500 rounded-[14px] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-orange-500/20">
            M
          </div>
          <span class="font-display text-xl font-bold text-slate-900 tracking-tight">Mie Level</span>
        </div>
        <h1 class="font-display text-2xl font-bold text-slate-900">Buat Akun Baru</h1>
        <p class="text-slate-500 text-sm mt-1">Lengkapi data untuk memulai pemesanan.</p>
      </div>

      <form id="registerForm" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-2" for="nama">Nama Lengkap</label>
          <input type="text" id="nama" name="nama" required autocomplete="name" placeholder="Masukkan nama lengkap" class="input-modern w-full px-4 py-3 border border-slate-200 rounded-[14px] text-slate-900 placeholder-slate-400 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-2" for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="nama@email.com" class="input-modern w-full px-4 py-3 border border-slate-200 rounded-[14px] text-slate-900 placeholder-slate-400 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-2" for="password">Password</label>
          <div class="relative"><input type="password" id="password" name="password" required autocomplete="new-password" placeholder="Minimal 6 karakter" class="input-modern w-full px-4 py-3 border border-slate-200 rounded-[14px] text-slate-900 placeholder-slate-400 text-sm" /><button type="button" onclick="togglePassword('password', this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" aria-label="Toggle"><i class="far fa-eye eye-icon text-sm"></i></button></div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-2" for="confirmPassword">Konfirmasi Password</label>
          <div class="relative"><input type="password" id="confirmPassword" name="confirmPassword" required autocomplete="new-password" placeholder="Ulangi password" class="input-modern w-full px-4 py-3 border border-slate-200 rounded-[14px] text-slate-900 placeholder-slate-400 text-sm" /><button type="button" onclick="togglePassword('confirmPassword', this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" aria-label="Toggle"><i class="far fa-eye eye-icon text-sm"></i></button></div>
        </div>
        <button type="submit" id="registerBtn" class="btn-primary w-full py-3.5 font-semibold rounded-[14px] text-sm shadow-md mt-1 flex items-center justify-center gap-2"><span>Daftar</span><i class="fas fa-arrow-right text-xs"></i></button>
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
</script>
</body></html>`;
}

// -------------------- DASHBOARD PAGE --------------------
function dashboardPage(user) {
  const products = [
    {
      id: "mie-gacoan",
      name: "Mie Gacoan",
      category: "mie",
      subtitle: "Pedas Asin Gurih",
      desc: "Mie pedas gurih pilihan bertabur daging ayam cincang gurih dan pangsit renyah.",
      price: 14000,
      priceFormatted: "14.000",
      badge: "Favorite",
      badgeColor: "bg-orange-500 text-white",
      image: "/image/mie_gacoan.png",
      rating: "4.9",
      prepTime: "10 - 15 Menit",
      portion: "1 Porsi (250g)"
    },
    {
      id: "mie-hompimpa",
      name: "Mie Hompimpa",
      category: "mie",
      subtitle: "Pedas Manis Gurih",
      desc: "Perpaduan cita rasa manis gurih dan pedas mantap yang meresap hingga ke helai mie.",
      price: 14000,
      priceFormatted: "14.000",
      badge: "Best Seller",
      badgeColor: "bg-orange-500 text-white",
      image: "/image/mie_hompimpa.png",
      rating: "4.9",
      prepTime: "10 - 15 Menit",
      portion: "1 Porsi (250g)"
    },
    {
      id: "mie-suit",
      name: "Mie Suit",
      category: "mie",
      subtitle: "Gurih Original (Non-Pedas)",
      desc: "Mie gurih original tanpa rasa pedas, cocok untuk penikmat cita rasa asli gurih manis.",
      price: 12000,
      priceFormatted: "12.000",
      badge: "Original",
      badgeColor: "bg-emerald-600 text-white",
      image: "/image/mie_suit.png",
      rating: "4.8",
      prepTime: "10 - 15 Menit",
      portion: "1 Porsi (250g)"
    },
    {
      id: "udang-keju",
      name: "Udang Keju",
      category: "dimsum",
      subtitle: "Keju Lumer Crispy",
      desc: "Dimsum olahan udang lembut dengan isian keju leleh manis gurih yang lumer di mulut.",
      price: 13000,
      priceFormatted: "13.000",
      badge: "Must Try",
      badgeColor: "bg-orange-500 text-white",
      image: "/image/udang_keju.png",
      rating: "5.0",
      prepTime: "8 - 12 Menit",
      portion: "3 Pcs"
    },
    {
      id: "udang-rambutan",
      name: "Udang Rambutan",
      category: "dimsum",
      subtitle: "Super Crispy",
      desc: "Bola-bola udang lembut dibalut krispi mi renyah bertekstur unik dan gurih.",
      price: 13000,
      priceFormatted: "13.000",
      badge: "Favorite",
      badgeColor: "bg-orange-500 text-white",
      image: "/image/udang_rambutan.png",
      rating: "4.9",
      prepTime: "8 - 12 Menit",
      portion: "3 Pcs"
    },
    {
      id: "lumpia-udang",
      name: "Lumpia Udang",
      category: "dimsum",
      subtitle: "Kulit Tahu Gurih",
      desc: "Lumpia isi olahan udang segar dipadu bumbu spesial berbalut kulit tahu renyah.",
      price: 13000,
      priceFormatted: "13.000",
      badge: "Must Try",
      badgeColor: "bg-orange-500 text-white",
      image: "/image/lumpia.png",
      rating: "4.8",
      prepTime: "8 - 12 Menit",
      portion: "3 Pcs"
    },
    {
      id: "pangsit-goreng",
      name: "Pangsit Goreng",
      category: "dimsum",
      subtitle: "Renyah Maksimal",
      desc: "Pangsit renyah isi daging pilihan yang lezat, teman sempurna pendamping mie pedas.",
      price: 11000,
      priceFormatted: "11.000",
      badge: "Favorite",
      badgeColor: "bg-orange-500 text-white",
      image: "/image/pangsit.png",
      rating: "4.8",
      prepTime: "5 - 10 Menit",
      portion: "5 Pcs"
    },
    {
      id: "es-gobak-sodor",
      name: "Es Gobak Sodor",
      category: "minuman",
      subtitle: "Es Buah Spesial",
      desc: "Perpaduan buah segar, jelly lembut, dan sirup spesial yang sangat dingin melegakan.",
      price: 10000,
      priceFormatted: "10.000",
      badge: "Best Seller",
      badgeColor: "bg-orange-500 text-white",
      image: "/image/es_gobaksodor.png",
      rating: "4.9",
      prepTime: "3 - 5 Menit",
      portion: "1 Gelas (400ml)"
    },
    {
      id: "es-jeruk",
      name: "Es Jeruk (Orange)",
      category: "minuman",
      subtitle: "Perasan Jeruk Asli",
      desc: "Minuman perasan jeruk murni dingin kaya akan Vitamin C untuk penawar rasa pedas.",
      price: 7000,
      priceFormatted: "7.000",
      badge: "Original",
      badgeColor: "bg-emerald-600 text-white",
      image: "/image/orange.png",
      rating: "4.8",
      prepTime: "3 - 5 Menit",
      portion: "1 Gelas (400ml)"
    },
    {
      id: "es-teh",
      name: "Es Teh Manis",
      category: "minuman",
      subtitle: "Teh Tubruk Segar",
      desc: "Es teh manis dengan racikan teh pilihan yang wangi dan menyegarkan.",
      price: 5000,
      priceFormatted: "5.000",
      badge: "Original",
      badgeColor: "bg-emerald-600 text-white",
      image: "/image/esteh.png",
      rating: "4.7",
      prepTime: "2 - 4 Menit",
      portion: "1 Gelas (400ml)"
    },
    {
      id: "air-mineral",
      name: "Air Mineral",
      category: "minuman",
      subtitle: "Pegunungan Murni",
      desc: "Air mineral dingin murni penyegar dahaga utama penyeimbang rasa pedas.",
      price: 4000,
      priceFormatted: "4.000",
      badge: "Original",
      badgeColor: "bg-emerald-600 text-white",
      image: "/image/air.png",
      rating: "4.9",
      prepTime: "1 - 2 Menit",
      portion: "1 Botol (600ml)"
    }
  ];

  const toppingsList = [
    { id: "telur", name: "Telur", price: 3000, priceFormatted: "+3.000" },
    { id: "keju", name: "Keju", price: 4000, priceFormatted: "+4.000" },
    { id: "pangsit", name: "Pangsit Goreng", price: 3000, priceFormatted: "+3.000" },
    { id: "ceker", name: "Ceker", price: 5000, priceFormatted: "+5.000" },
    { id: "bakso", name: "Bakso", price: 4000, priceFormatted: "+4.000" },
  ];

  const productsJson = JSON.stringify(products);
  const toppingsJson = JSON.stringify(toppingsList);

  return `<!DOCTYPE html>
<html lang="id">
<head>${baseHead("Dashboard Menu")}</head>
<body class="min-h-screen text-slate-900 antialiased bg-[#FFFBF7]">

<!-- Navigation Bar -->
<nav class="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16 sm:h-20">
      
      <!-- Brand Logo -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-orange-500 rounded-[14px] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-orange-500/20">
          M
        </div>
        <div>
          <span class="font-display text-lg font-bold text-slate-900 tracking-tight block leading-none">Mie Level</span>
          <span class="text-[10px] text-orange-600 font-medium block mt-0.5">Spicy Culinary Order</span>
        </div>
      </div>

      <!-- Quick Search Bar (Desktop) -->
      <div class="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div class="relative w-full">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><i class="fas fa-search text-xs"></i></span>
          <input type="text" id="searchInputNav" onkeyup="filterMenuSearch(this.value)" placeholder="Cari Mie Gacoan, Udang Keju, Es Teh..." class="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-[14px] focus:bg-white focus:border-orange-500 focus:outline-none transition-all" />
        </div>
      </div>

      <!-- Right Controls -->
      <div class="flex items-center gap-3">
        
        <!-- Cart Trigger Button -->
        <button onclick="toggleCartDrawer()" class="btn-primary relative px-4 py-2.5 rounded-[14px] font-medium text-xs flex items-center gap-2 shadow-sm">
          <i class="fas fa-shopping-bag text-sm"></i>
          <span class="hidden sm:inline">Keranjang</span>
          <span id="cartCountBadge" class="bg-white text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-bold">0</span>
        </button>

        <!-- User Profile -->
        <div class="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-[14px] px-3 py-1.5">
          <div class="w-8 h-8 bg-orange-500 rounded-[10px] flex items-center justify-center text-xs font-bold text-white shadow-sm">
            ${user.nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <p class="text-slate-900 text-xs font-semibold leading-tight">${user.nama}</p>
            <p class="text-slate-400 text-[10px]">${user.role === 'ADMIN' ? 'Admin' : 'Member'}</p>
          </div>
        </div>

        <!-- Logout -->
        <a href="/api/logout" id="logoutBtn" title="Keluar" class="btn-secondary px-3 py-2 rounded-[14px] text-xs font-medium flex items-center gap-1.5">
          <i class="fas fa-sign-out-alt text-slate-500 text-xs"></i>
          <span class="hidden sm:inline">Keluar</span>
        </a>
      </div>
    </div>
  </div>
</nav>

<!-- Redesigned Hero Section -->
<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
  <div class="bg-white rounded-[24px] border border-slate-100 p-6 sm:p-10 shadow-sm overflow-hidden">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      
      <!-- Left Column: Content & CTAs -->
      <div class="lg:col-span-7 space-y-6">
        <div class="inline-flex items-center px-3.5 py-1 bg-orange-50 border border-orange-100 rounded-full text-orange-600 text-xs font-semibold">
          Kuliner Mie Pedas
        </div>

        <div class="space-y-1">
          <p class="text-slate-500 text-base sm:text-lg font-medium">Selamat Datang Kembali,</p>
          <h1 class="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
            ${user.nama}
          </h1>
        </div>

        <p class="text-slate-500 text-sm leading-relaxed max-w-xl">
          Nikmati mie pedas dengan cita rasa terbaik. Pilih menu favoritmu dan atur level pedas sesuai selera.
        </p>

        <!-- Two CTA Buttons -->
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button onclick="scrollToMenu()" class="btn-primary px-6 py-3.5 rounded-[16px] text-xs font-semibold shadow-md flex items-center gap-2">
            <span>Pesan Sekarang</span>
            <i class="fas fa-arrow-right text-xs"></i>
          </button>
          <button onclick="scrollToMenu()" class="btn-secondary px-6 py-3.5 rounded-[16px] text-xs font-semibold flex items-center gap-2">
            <span>Lihat Menu</span>
          </button>
        </div>

        <!-- Only Two Simple Feature Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div class="flex items-center gap-3.5 bg-[#FFFBF7] p-3.5 rounded-[16px] border border-slate-100">
            <div class="w-10 h-10 rounded-[12px] bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              <i class="fas fa-pepper-hot"></i>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-900">Level Pedas 0–8</p>
              <p class="text-[11px] text-slate-500">Sesuaikan Kepedasan Sesuai Selera</p>
            </div>
          </div>

          <div class="flex items-center gap-3.5 bg-[#FFFBF7] p-3.5 rounded-[16px] border border-slate-100">
            <div class="w-10 h-10 rounded-[12px] bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              <i class="fas fa-fire-burner"></i>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-900">Fresh Cooked</p>
              <p class="text-[11px] text-slate-500">Dimasak Segar Setiap Pesanan</p>
            </div>
          </div>
        </div>

      </div>

      <!-- Right Column: Single Large Hero Image -->
      <div class="lg:col-span-5">
        <div class="relative h-72 sm:h-96 w-full rounded-[20px] overflow-hidden shadow-lg border border-slate-100">
          <img src="/image/mie_gacoan.png" alt="Mie Pedas Hero" class="w-full h-full object-cover transform hover:scale-105 transition duration-700" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent"></div>
          <div class="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3.5 rounded-[16px] border border-white/40 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-slate-900">Mie Gacoan Original</p>
              <p class="text-[11px] text-orange-600 font-semibold">Menu Terpopuler Hari Ini</p>
            </div>
            <span class="text-xs font-bold text-slate-900 bg-orange-50 px-2.5 py-1 rounded-full text-orange-600">Rp 14.000</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- Menu Showcase Section -->
<section id="menuSection" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  
  <!-- Header & Controls Bar -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
    <div>
      <h2 class="font-display text-2xl font-bold text-slate-900">Daftar Menu Spesial</h2>
      <p class="text-slate-500 text-xs sm:text-sm mt-1">Pilih hidangan favoritmu dan klik untuk mengatur tingkat kepedasan & topping</p>
    </div>

    <!-- Controls: Search & Category Tabs -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div class="relative w-full sm:w-64">
        <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><i class="fas fa-search text-xs"></i></span>
        <input type="text" id="searchInput" onkeyup="filterMenuSearch(this.value)" placeholder="Cari nama menu..." class="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-[14px] focus:border-orange-500 focus:outline-none shadow-sm" />
      </div>

      <select id="sortSelect" onchange="sortProducts(this.value)" class="bg-white border border-slate-200 rounded-[14px] px-3.5 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-orange-500 shadow-sm">
        <option value="default">Urutan Default</option>
        <option value="price-asc">Harga: Terrendah</option>
        <option value="price-desc">Harga: Tertinggi</option>
        <option value="name">Nama Menu A-Z</option>
      </select>
    </div>
  </div>

  <!-- Category Tabs -->
  <div class="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none mb-8">
    <button onclick="setCategoryFilter('all')" id="tab-all" class="category-tab active px-5 py-2.5 rounded-[14px] text-xs font-semibold transition-all shadow-sm bg-orange-500 text-white flex-shrink-0">
      Semua Menu
    </button>
    <button onclick="setCategoryFilter('mie')" id="tab-mie" class="category-tab px-5 py-2.5 rounded-[14px] text-xs font-semibold transition-all bg-white border border-slate-200 text-slate-700 hover:border-orange-500 hover:text-orange-500 flex-shrink-0">
      Mie Pedas
    </button>
    <button onclick="setCategoryFilter('dimsum')" id="tab-dimsum" class="category-tab px-5 py-2.5 rounded-[14px] text-xs font-semibold transition-all bg-white border border-slate-200 text-slate-700 hover:border-orange-500 hover:text-orange-500 flex-shrink-0">
      Dimsum & Cemilan
    </button>
    <button onclick="setCategoryFilter('minuman')" id="tab-minuman" class="category-tab px-5 py-2.5 rounded-[14px] text-xs font-semibold transition-all bg-white border border-slate-200 text-slate-700 hover:border-orange-500 hover:text-orange-500 flex-shrink-0">
      Minuman Segar
    </button>
  </div>

  <!-- Product Cards Grid -->
  <div id="productGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    <!-- Rendered dynamically by JavaScript -->
  </div>

  <!-- Empty State fallback -->
  <div id="emptyState" class="hidden text-center py-16 bg-white rounded-[20px] border border-slate-200 shadow-sm mt-4">
    <div class="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3 text-lg">
      <i class="fas fa-search"></i>
    </div>
    <h3 class="font-bold text-slate-800 text-sm">Menu Tidak Ditemukan</h3>
    <p class="text-slate-500 text-xs mt-1">Coba kata kunci pencarian lain atau ubah kategori.</p>
    <button onclick="resetFilters()" class="btn-secondary mt-4 px-4 py-2 rounded-[12px] text-xs font-semibold text-orange-600">Reset Filter</button>
  </div>
</section>

<!-- Food Detail Slide-Over Panel / Drawer -->
<div id="drawerOverlay" onclick="closeFoodDetailDrawer()" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 opacity-0 pointer-events-none transition-opacity duration-300"></div>

<aside id="foodDetailDrawer" class="detail-drawer fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col translate-x-full overflow-hidden">
  
  <!-- Drawer Header with Close -->
  <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
    <span class="text-xs font-semibold text-slate-500">Detail Menu</span>
    <button onclick="closeFoodDetailDrawer()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition-colors">
      <i class="fas fa-times"></i>
    </button>
  </div>

  <!-- Drawer Scrollable Content -->
  <div class="flex-1 overflow-y-auto p-6 space-y-6">
    <!-- Large Image Banner -->
    <div class="relative h-56 w-full rounded-[20px] overflow-hidden bg-slate-100 shadow-sm">
      <img id="drawerImage" src="" class="w-full h-full object-cover" />
      <span id="drawerBadge" class="absolute top-3 left-3 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm"></span>
      <span id="drawerRating" class="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-slate-800 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
        <i class="fas fa-star text-amber-400"></i> <span id="drawerRatingVal">4.9</span>
      </span>
    </div>

    <!-- Title, Price, Description -->
    <div>
      <div class="flex items-center justify-between mb-1">
        <h3 id="drawerName" class="font-display text-xl font-bold text-slate-900"></h3>
        <span id="drawerPrice" class="font-display text-lg font-bold text-orange-600"></span>
      </div>
      <p id="drawerSubtitle" class="text-xs text-orange-600 font-medium mb-2"></p>
      <p id="drawerDesc" class="text-xs text-slate-500 leading-relaxed"></p>
    </div>

    <!-- Estimated Prep Time & Portion Info -->
    <div class="grid grid-cols-2 gap-3 pt-2">
      <div class="flex items-center gap-2.5 bg-slate-50 p-3 rounded-[14px] border border-slate-100">
        <i class="far fa-clock text-orange-500 text-sm"></i>
        <div>
          <span class="text-[10px] text-slate-400 block font-medium">Estimasi Waktu</span>
          <span id="drawerPrepTime" class="text-xs font-bold text-slate-800">10 - 15 Menit</span>
        </div>
      </div>

      <div class="flex items-center gap-2.5 bg-slate-50 p-3 rounded-[14px] border border-slate-100">
        <i class="fas fa-utensils text-orange-500 text-sm"></i>
        <div>
          <span class="text-[10px] text-slate-400 block font-medium">Porsi</span>
          <span id="drawerPortion" class="text-xs font-bold text-slate-800">1 Porsi (250g)</span>
        </div>
      </div>
    </div>

    <!-- Spice Level Selection Cards (Noodle Category Only) -->
    <div id="drawerSpiceContainer" class="space-y-3 pt-4 border-t border-slate-100">
      <div class="flex items-center justify-between">
        <label class="block text-xs font-bold text-slate-900">Pilih Level Pedas</label>
        <span id="drawerSelectedSpiceLabel" class="text-xs font-semibold text-orange-600">Level 0 (Tidak Pedas)</span>
      </div>

      <div class="space-y-2" id="drawerSpiceCards">
        <!-- Spice level cards rendered dynamically -->
      </div>
    </div>

    <!-- Optional Toppings Checkboxes -->
    <div class="space-y-3 pt-4 border-t border-slate-100">
      <label class="block text-xs font-bold text-slate-900">Topping Tambahan (Opsional)</label>
      <div class="space-y-2" id="drawerToppingsList">
        <!-- Rendered dynamically -->
      </div>
    </div>
  </div>

  <!-- Sticky Bottom Action Bar -->
  <div class="p-5 border-t border-slate-100 bg-white space-y-3 shadow-lg z-10">
    <div class="flex items-center justify-between gap-4">
      
      <!-- Quantity Selector -->
      <div class="flex items-center border border-slate-200 rounded-[14px] overflow-hidden bg-slate-50">
        <button onclick="changeDrawerQty(-1)" class="px-3.5 py-2 text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors">-</button>
        <span id="drawerQtyVal" class="px-3 py-2 text-xs font-bold text-slate-900">1</span>
        <button onclick="changeDrawerQty(1)" class="px-3.5 py-2 text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors">+</button>
      </div>

      <!-- Sticky Add to Cart Button -->
      <button onclick="confirmDrawerAddToCart()" class="btn-primary flex-1 py-3.5 rounded-[14px] text-xs font-semibold shadow-md flex items-center justify-center gap-2">
        <i class="fas fa-shopping-bag text-xs"></i>
        <span>Tambah - <span id="drawerTotalPrice">Rp 0</span></span>
      </button>
    </div>
  </div>
</aside>

<!-- Shopping Cart Slide-over Drawer -->
<div id="cartOverlay" onclick="toggleCartDrawer()" class="cart-overlay fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 opacity-0 pointer-events-none transition-opacity duration-300"></div>

<aside id="cartDrawer" class="cart-drawer fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col translate-x-full">
  <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
    <div class="flex items-center gap-2.5">
      <div class="w-9 h-9 bg-orange-100 text-orange-600 rounded-[12px] flex items-center justify-center font-bold text-sm">
        <i class="fas fa-shopping-bag"></i>
      </div>
      <div>
        <h3 class="font-bold text-slate-800 text-xs">Keranjang Pesanan</h3>
        <p class="text-[10px] text-slate-400"><span id="cartTotalItemsCount">0</span> item terpilih</p>
      </div>
    </div>
    <button onclick="toggleCartDrawer()" class="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs transition-colors">
      <i class="fas fa-times"></i>
    </button>
  </div>

  <div id="cartItemsContainer" class="flex-1 overflow-y-auto p-5 space-y-3">
    <!-- Cart Items rendered dynamically -->
  </div>

  <div class="p-5 border-t border-slate-100 bg-white space-y-3 shadow-lg">
    <div class="space-y-1.5 text-xs text-slate-500">
      <div class="flex justify-between"><span>Subtotal Produk</span><span id="cartSubtotal" class="font-bold text-slate-800">Rp 0</span></div>
      <div class="flex justify-between"><span>Biaya Layanan</span><span class="font-bold text-emerald-600">GRATIS</span></div>
      <div class="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
        <span>Total Pembayaran</span>
        <span id="cartTotal" class="text-orange-600">Rp 0</span>
      </div>
    </div>

    <button id="checkoutBtn" onclick="processCheckout()" class="btn-primary w-full py-3.5 font-semibold rounded-[14px] text-xs shadow-md flex items-center justify-center gap-2">
      <span>Konfirmasi Pesanan</span>
      <i class="fas fa-arrow-right text-xs"></i>
    </button>
  </div>
</aside>

<!-- Toast Notification -->
<div id="toast" class="toast" role="alert"></div>

<!-- Footer -->
<footer class="border-t border-slate-200 bg-white py-8 mt-12">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 bg-orange-500 rounded-[10px] flex items-center justify-center text-white text-xs font-bold shadow-sm">M</div>
        <div>
          <span class="font-display text-xs font-bold text-slate-900">Mie Level</span>
          <p class="text-[10px] text-slate-400">Authentic Spicy Noodle Experience</p>
        </div>
      </div>
      <div class="flex items-center gap-6 text-xs text-slate-400">
        <span>&copy; 2026 Mie Level</span>
        <span>&bull;</span>
        <span>Premium Food Ordering</span>
      </div>
    </div>
  </div>
</footer>

<script>
// Repository Data
const productsData = ${productsJson};
const toppingsData = ${toppingsJson};

const spiceLevelsConfig = [
  { levelId: 0, title: "Level 0 (Tidak Pedas)", chilis: 0, desc: "Original gurih tanpa rasa pedas" },
  { levelId: 1, title: "Level 1–2 (Ringan)", chilis: 1, desc: "Pedas samar yang pas untuk pemula" },
  { levelId: 2, title: "Level 3–4 (Sedang)", chilis: 2, desc: "Pedas sedang yang bikin ketagihan" },
  { levelId: 3, title: "Level 5–6 (Pedas)", chilis: 3, desc: "Pedas mantap untuk pecinta tantangan" },
  { levelId: 4, title: "Level 7–8 (Extra Pedas)", chilis: 4, desc: "Sensasi pedas murni level tertinggi" },
];

let activeCategory = 'all';
let currentSearch = '';
let currentSort = 'default';
let cart = [];

// Drawer Transient State
let activeDrawerItem = null;
let activeDrawerQty = 1;
let activeDrawerSpiceId = 0;
let activeDrawerToppings = [];

// Initialize Page
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
});

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.className = 'toast toast-' + type + ' show';
  t.innerHTML = '<span>' + msg + '</span>';
  setTimeout(() => t.classList.remove('show'), 3500);
}

function scrollToMenu() {
  document.getElementById('menuSection').scrollIntoView({ behavior: 'smooth' });
}

// Render Products Grid
function renderProducts() {
  const grid = document.getElementById('productGrid');
  const empty = document.getElementById('emptyState');

  let filtered = productsData.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(currentSearch.toLowerCase()) || 
                        p.subtitle.toLowerCase().includes(currentSearch.toLowerCase()) ||
                        p.desc.toLowerCase().includes(currentSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  if (currentSort === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = filtered.map(p => {
    return '<div class="card-premium overflow-hidden flex flex-col group border border-slate-100 cursor-pointer" data-id="' + p.id + '" onclick="openFoodDetailDrawer(this.dataset.id)">' +
      '<div class="relative h-52 bg-slate-100 overflow-hidden">' +
        '<img src="' + p.image + '" alt="' + p.name + '" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"/>' +
        '<span class="absolute top-3 left-3 ' + p.badgeColor + ' px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">' + p.badge + '</span>' +
        '<span class="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">' +
          '<i class="fas fa-star text-amber-400"></i> ' + p.rating +
        '</span>' +
      '</div>' +
      '<div class="p-5 flex-1 flex flex-col justify-between">' +
        '<div>' +
          '<h3 class="font-display text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors">' + p.name + '</h3>' +
          '<p class="text-slate-500 text-xs mt-1 line-clamp-2 leading-relaxed">' + p.subtitle + '</p>' +
        '</div>' +
        '<div class="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">' +
          '<span class="font-display text-base font-bold text-slate-900">Rp ' + p.priceFormatted + '</span>' +
          '<span class="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1">Pesan <i class="fas fa-chevron-right text-[10px]"></i></span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// Category Tabs
function setCategoryFilter(cat) {
  activeCategory = cat;
  document.querySelectorAll('.category-tab').forEach(btn => {
    btn.classList.remove('bg-orange-500', 'text-white', 'shadow-sm');
    btn.classList.add('bg-white', 'border', 'border-slate-200', 'text-slate-700');
  });

  const activeBtn = document.getElementById('tab-' + cat);
  if (activeBtn) {
    activeBtn.classList.remove('bg-white', 'border', 'border-slate-200', 'text-slate-700');
    activeBtn.classList.add('bg-orange-500', 'text-white', 'shadow-sm');
  }
  renderProducts();
}

function filterMenuSearch(val) {
  currentSearch = val;
  renderProducts();
}

function sortProducts(val) {
  currentSort = val;
  renderProducts();
}

function resetFilters() {
  currentSearch = '';
  currentSort = 'default';
  document.getElementById('searchInput').value = '';
  document.getElementById('searchInputNav').value = '';
  document.getElementById('sortSelect').value = 'default';
  setCategoryFilter('all');
}

// Food Detail Drawer Handlers
function openFoodDetailDrawer(id) {
  const item = productsData.find(p => p.id === id);
  if (!item) return;

  activeDrawerItem = item;
  activeDrawerQty = 1;
  activeDrawerSpiceId = 0;
  activeDrawerToppings = [];

  document.getElementById('drawerImage').src = item.image;
  document.getElementById('drawerName').innerText = item.name;
  document.getElementById('drawerPrice').innerText = 'Rp ' + item.priceFormatted;
  document.getElementById('drawerSubtitle').innerText = item.subtitle;
  document.getElementById('drawerDesc').innerText = item.desc;
  document.getElementById('drawerPrepTime').innerText = item.prepTime;
  document.getElementById('drawerPortion').innerText = item.portion;
  document.getElementById('drawerRatingVal').innerText = item.rating;

  const badge = document.getElementById('drawerBadge');
  badge.innerText = item.badge;
  badge.className = 'absolute top-3 left-3 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm ' + item.badgeColor;

  // Spice Levels (Shown only if category === 'mie')
  const spiceContainer = document.getElementById('drawerSpiceContainer');
  if (item.category === 'mie') {
    spiceContainer.classList.remove('hidden');
    renderDrawerSpiceCards();
  } else {
    spiceContainer.classList.add('hidden');
  }

  renderDrawerToppings();
  updateDrawerTotalPrice();

  const drawer = document.getElementById('foodDetailDrawer');
  const overlay = document.getElementById('drawerOverlay');
  drawer.classList.add('open');
  overlay.classList.remove('opacity-0', 'pointer-events-none');
}

function closeFoodDetailDrawer() {
  const drawer = document.getElementById('foodDetailDrawer');
  const overlay = document.getElementById('drawerOverlay');
  drawer.classList.remove('open');
  overlay.classList.add('opacity-0', 'pointer-events-none');
}

function renderDrawerSpiceCards() {
  const container = document.getElementById('drawerSpiceCards');
  container.innerHTML = spiceLevelsConfig.map(s => {
    const isSel = s.levelId === activeDrawerSpiceId;
    let chilisHtml = '';
    for (let i = 0; i < s.chilis; i++) {
      chilisHtml += '<i class="fas fa-pepper-hot text-xs text-red-500"></i> ';
    }
    if (s.chilis === 0) {
      chilisHtml = '<span class="text-xs text-slate-400">Non-Pedas</span>';
    }

    const borderCls = isSel ? 'border-2 border-orange-500 bg-orange-50/80 shadow-sm' : 'border border-slate-200 bg-white hover:border-orange-300';
    return '<div data-spiceid="' + s.levelId + '" onclick="selectDrawerSpice(parseInt(this.dataset.spiceid))" class="p-3 rounded-[14px] cursor-pointer transition-all flex items-center justify-between ' + borderCls + '">' +
      '<div>' +
        '<p class="text-xs font-bold text-slate-900">' + s.title + '</p>' +
        '<p class="text-[11px] text-slate-500 mt-0.5">' + s.desc + '</p>' +
      '</div>' +
      '<div class="flex items-center gap-1">' + chilisHtml + '</div>' +
    '</div>';
  }).join('');

  const selConfig = spiceLevelsConfig.find(s => s.levelId === activeDrawerSpiceId);
  document.getElementById('drawerSelectedSpiceLabel').innerText = selConfig ? selConfig.title : '';
}

function selectDrawerSpice(spiceId) {
  activeDrawerSpiceId = spiceId;
  renderDrawerSpiceCards();
}

function renderDrawerToppings() {
  const container = document.getElementById('drawerToppingsList');
  container.innerHTML = toppingsData.map(t => {
    const isChecked = activeDrawerToppings.includes(t.id);
    const bgCls = isChecked ? 'bg-orange-50/60 border-orange-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300';
    
    return '<div data-toppingid="' + t.id + '" onclick="toggleDrawerTopping(this.dataset.toppingid)" class="p-3 rounded-[14px] border cursor-pointer flex items-center justify-between transition-all ' + bgCls + '">' +
      '<div class="flex items-center gap-2.5">' +
        '<div class="w-4 h-4 rounded border flex items-center justify-center ' + (isChecked ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300 bg-white') + '"><i class="fas fa-check text-[10px] ' + (isChecked ? '' : 'hidden') + '"></i></div>' +
        '<span class="text-xs font-medium text-slate-900">' + t.name + '</span>' +
      '</div>' +
      '<span class="text-xs font-semibold text-orange-600">' + t.priceFormatted + '</span>' +
    '</div>';
  }).join('');
}

function toggleDrawerTopping(topId) {
  if (activeDrawerToppings.includes(topId)) {
    activeDrawerToppings = activeDrawerToppings.filter(id => id !== topId);
  } else {
    activeDrawerToppings.push(topId);
  }
  renderDrawerToppings();
  updateDrawerTotalPrice();
}

function changeDrawerQty(delta) {
  activeDrawerQty = Math.max(1, activeDrawerQty + delta);
  document.getElementById('drawerQtyVal').innerText = activeDrawerQty;
  updateDrawerTotalPrice();
}

function updateDrawerTotalPrice() {
  if (!activeDrawerItem) return;

  let unitPrice = activeDrawerItem.price;
  activeDrawerToppings.forEach(topId => {
    const t = toppingsData.find(x => x.id === topId);
    if (t) unitPrice += t.price;
  });

  const total = unitPrice * activeDrawerQty;
  document.getElementById('drawerTotalPrice').innerText = 'Rp ' + total.toLocaleString('id-ID');
}

function confirmDrawerAddToCart() {
  if (!activeDrawerItem) return;

  const spiceObj = spiceLevelsConfig.find(s => s.levelId === activeDrawerSpiceId);
  const selectedToppingsObjs = activeDrawerToppings.map(topId => toppingsData.find(x => x.id === topId)).filter(Boolean);

  let unitPrice = activeDrawerItem.price;
  selectedToppingsObjs.forEach(t => unitPrice += t.price);

  const cartItemId = activeDrawerItem.id + '-sp' + activeDrawerSpiceId + '-' + activeDrawerToppings.sort().join('_');

  const existing = cart.find(c => c.cartItemId === cartItemId);
  if (existing) {
    existing.qty += activeDrawerQty;
  } else {
    cart.push({
      cartItemId: cartItemId,
      id: activeDrawerItem.id,
      name: activeDrawerItem.name,
      image: activeDrawerItem.image,
      unitPrice: unitPrice,
      qty: activeDrawerQty,
      spiceTitle: (activeDrawerItem.category === 'mie' && spiceObj) ? spiceObj.title : null,
      toppings: selectedToppingsObjs.map(t => t.name)
    });
  }

  showToast(activeDrawerItem.name + ' berhasil ditambahkan ke keranjang!', 'success');
  closeFoodDetailDrawer();
  updateCartUI();
}

// Cart Drawer Handlers
function toggleCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  const isOpen = drawer.classList.contains('open');

  if (isOpen) {
    drawer.classList.remove('open');
    overlay.classList.add('opacity-0', 'pointer-events-none');
  } else {
    updateCartUI();
    drawer.classList.add('open');
    overlay.classList.remove('opacity-0', 'pointer-events-none');
  }
}

function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('cartCountBadge').innerText = totalItems;
  document.getElementById('cartTotalItemsCount').innerText = totalItems;

  const container = document.getElementById('cartItemsContainer');
  if (cart.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-slate-400">' +
        '<i class="fas fa-shopping-basket text-3xl mb-3 text-slate-300 block"></i>' +
        '<p class="text-xs font-medium">Keranjang belanja masih kosong.</p>' +
      '</div>';
    document.getElementById('cartSubtotal').innerText = 'Rp 0';
    document.getElementById('cartTotal').innerText = 'Rp 0';
    return;
  }

  let subtotal = 0;
  container.innerHTML = cart.map(item => {
    const itemTotal = item.unitPrice * item.qty;
    subtotal += itemTotal;

    const spiceTag = item.spiceTitle ? '<span class="inline-block bg-orange-50 text-orange-600 text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5">' + item.spiceTitle + '</span>' : '';
    const toppingTag = item.toppings && item.toppings.length > 0 ? '<p class="text-[10px] text-slate-400 mt-0.5">Topping: ' + item.toppings.join(', ') + '</p>' : '';

    return '<div class="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-[16px]">' +
        '<img src="' + item.image + '" class="w-14 h-14 object-cover rounded-[12px] border border-slate-200/50 flex-shrink-0"/>' +
        '<div class="flex-1 min-w-0">' +
          '<h4 class="font-bold text-xs text-slate-900 truncate">' + item.name + '</h4>' +
          spiceTag +
          toppingTag +
          '<p class="text-xs font-bold text-slate-800 mt-1">Rp ' + itemTotal.toLocaleString('id-ID') + '</p>' +
        '</div>' +
        '<div class="flex items-center border border-slate-200 rounded-[10px] overflow-hidden bg-white">' +
          '<button data-id="' + item.cartItemId + '" onclick="updateCartQty(this.dataset.id, -1)" class="px-2.5 py-1 text-slate-600 hover:bg-slate-100 text-[10px] font-bold">-</button>' +
          '<span class="px-2 py-1 text-xs font-bold text-slate-800">' + item.qty + '</span>' +
          '<button data-id="' + item.cartItemId + '" onclick="updateCartQty(this.dataset.id, 1)" class="px-2.5 py-1 text-slate-600 hover:bg-slate-100 text-[10px] font-bold">+</button>' +
        '</div>' +
      '</div>';
  }).join('');

  document.getElementById('cartSubtotal').innerText = 'Rp ' + subtotal.toLocaleString('id-ID');
  document.getElementById('cartTotal').innerText = 'Rp ' + subtotal.toLocaleString('id-ID');
}

function updateCartQty(cartItemId, delta) {
  const item = cart.find(c => c.cartItemId === cartItemId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(c => c.cartItemId !== cartItemId);
  }
  updateCartUI();
}

function processCheckout() {
  if (cart.length === 0) {
    showToast('Keranjangmu masih kosong! Silakan pilih menu terlebih dahulu.', 'error');
    return;
  }

  showToast('Pesanan berhasil dibuat! Tim Mie Level sedang menyiapkan hidanganmu', 'success');
  cart = [];
  updateCartUI();
  toggleCartDrawer();
}
</script>

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
