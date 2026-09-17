import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const authUser = await getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const orderId = parseInt(params.orderId, 10);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { success: false, message: "Order ID tidak valid." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: { gambarUrl: true },
            },
            toppings: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    // Security: user can only view their own orders (admin can view all)
    if (order.userId !== authUser.id && authUser.role !== "Admin") {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke pesanan ini." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (err) {
    console.error("Order detail error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail pesanan." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const authUser = await getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const orderId = parseInt(params.orderId, 10);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { success: false, message: "Order ID tidak valid." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, status: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    // Only owner can update status
    if (order.userId !== authUser.id) {
      return NextResponse.json(
        { success: false, message: "Anda tidak berhak mengubah pesanan ini." },
        { status: 403 }
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "Hanya pesanan PENDING yang bisa diselesaikan." },
        { status: 400 }
      );
    }

    const body = await req.json();
    if (body.status !== "COMPLETED") {
      return NextResponse.json(
        { success: false, message: "Status tidak valid." },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED", paymentStatus: "PAID" },
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (err) {
    console.error("Update order error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal mengubah status pesanan." },
      { status: 500 }
    );
  }
}
