import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { id: "asc" } });
    return NextResponse.json({ success: true, data: categories });
  } catch (err) {
    console.error("Categories error:", err);
    return NextResponse.json({ success: false, message: "Gagal mengambil kategori." }, { status: 500 });
  }
}
