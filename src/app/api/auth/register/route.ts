import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "mie-level-super-secret-key-change-in-production-2026";

export async function POST(req: NextRequest) {
  try {
    const { nama, email, password, confirmPassword } = await req.json();

    const errors: string[] = [];
    if (!nama || nama.trim().length < 2) errors.push("Nama harus minimal 2 karakter.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email tidak valid.");
    if (!password || password.length < 6) errors.push("Password harus minimal 6 karakter.");
    if (password !== confirmPassword) errors.push("Konfirmasi password tidak cocok.");

    if (errors.length > 0) {
      return NextResponse.json({ success: false, message: errors.join(" ") }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ success: false, message: "Email sudah terdaftar." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { nama: nama.trim(), email: email.toLowerCase().trim(), password: hashedPassword, role: "Member" },
    });

    const token = jwt.sign({ id: user.id, email: user.email, nama: user.nama, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    const response = NextResponse.json({ success: true, message: "Registrasi berhasil!", redirect: "/dashboard" }, { status: 201 });
    response.cookies.set("mie_level_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ success: false, message: "Terjadi kesalahan server." }, { status: 500 });
  }
}
