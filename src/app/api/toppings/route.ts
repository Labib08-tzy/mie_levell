import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const toppings = await prisma.topping.findMany({ where: { isAvailable: true }, orderBy: { id: "asc" } });
    return NextResponse.json({ success: true, data: toppings });
  } catch (err) {
    console.error("Toppings error:", err);
    return NextResponse.json({ success: false, message: "Gagal mengambil topping." }, { status: 500 });
  }
}
