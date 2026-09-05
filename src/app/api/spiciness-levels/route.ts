import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const levels = await prisma.spicinessLevel.findMany({ orderBy: { level: "asc" } });
    return NextResponse.json({ success: true, data: levels });
  } catch (err) {
    console.error("SpicinessLevels error:", err);
    return NextResponse.json({ success: false, message: "Gagal mengambil level pedas." }, { status: 500 });
  }
}
