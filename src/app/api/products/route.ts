import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isAvailable: true },
      include: { category: true },
      orderBy: { id: "asc" },
    });
    return NextResponse.json({ success: true, data: products });
  } catch (err) {
    console.error("Products error:", err);
    return NextResponse.json({ success: false, message: "Gagal mengambil data produk." }, { status: 500 });
  }
}
