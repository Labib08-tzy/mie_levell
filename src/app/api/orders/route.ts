import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItemInput {
  productId: number;
  quantity: number;
  spicinessLevelId: number;
  toppingIds: number[];
  catatan?: string;
}

interface CreateOrderBody {
  customerName: string;
  phone: string;
  orderType: "DINE_IN" | "TAKEAWAY";
  note?: string;
  items: OrderItemInput[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_ORDER_TYPES = ["DINE_IN", "TAKEAWAY"];

/**
 * Generate unique order number: ML-YYYYMMDD-XXXX
 * Counter resets daily. Uses DB count + 1 for the sequence.
 */
async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const todayCount = await prisma.order.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  const seq = (todayCount + 1).toString().padStart(4, "0");
  return `ML-${dateStr}-${seq}`;
}

function validatePhone(phone: string): boolean {
  // Basic Indonesian phone validation: 08xx or +628xx, 10-15 digits
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^(\+62|62|08)\d{8,13}$/.test(cleaned);
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const authUser = await getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    // 2. Parse & validate body
    const body: CreateOrderBody = await req.json();

    const errors: string[] = [];

    if (!body.customerName || body.customerName.trim().length < 2) {
      errors.push("Nama pelanggan harus minimal 2 karakter.");
    }
    if (!body.phone || !validatePhone(body.phone)) {
      errors.push("Nomor HP tidak valid.");
    }
    if (!body.orderType || !VALID_ORDER_TYPES.includes(body.orderType)) {
      errors.push("Jenis pesanan harus 'DINE_IN' atau 'TAKEAWAY'.");
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      errors.push("Keranjang tidak boleh kosong.");
    }

    // Validate each item
    if (body.items && Array.isArray(body.items)) {
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (!item.productId || typeof item.productId !== "number") {
          errors.push(`Item ${i + 1}: productId tidak valid.`);
        }
        if (!item.quantity || typeof item.quantity !== "number" || item.quantity < 1 || !Number.isInteger(item.quantity)) {
          errors.push(`Item ${i + 1}: quantity harus bilangan bulat positif.`);
        }
        if (!item.spicinessLevelId || typeof item.spicinessLevelId !== "number") {
          errors.push(`Item ${i + 1}: spicinessLevelId tidak valid.`);
        }
        if (item.toppingIds && !Array.isArray(item.toppingIds)) {
          errors.push(`Item ${i + 1}: toppingIds harus berupa array.`);
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors.join(" ") },
        { status: 400 }
      );
    }

    // 3. Fetch all referenced data from DB
    const productIds = Array.from(new Set(body.items.map((i) => i.productId)));
    const spicinessIds = Array.from(new Set(body.items.map((i) => i.spicinessLevelId)));
    const allToppingIds = Array.from(new Set(body.items.flatMap((i) => i.toppingIds || [])));

    const [products, spicinessLevels, toppings] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: productIds } } }),
      prisma.spicinessLevel.findMany({ where: { id: { in: spicinessIds } } }),
      allToppingIds.length > 0
        ? prisma.topping.findMany({ where: { id: { in: allToppingIds } } })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const spicinessMap = new Map(spicinessLevels.map((s) => [s.id, s]));
    const toppingMap = new Map(toppings.map((t) => [t.id, t]));

    // 4. Validate existence & availability, calculate prices server-side
    const validationErrors: string[] = [];
    let orderSubtotal = 0;

    const processedItems = body.items.map((item, idx) => {
      const product = productMap.get(item.productId);
      if (!product) {
        validationErrors.push(`Item ${idx + 1}: Produk tidak ditemukan.`);
        return null;
      }
      if (!product.isAvailable || product.stok < 1) {
        validationErrors.push(`Item ${idx + 1}: "${product.nama}" tidak tersedia.`);
        return null;
      }

      const spiciness = spicinessMap.get(item.spicinessLevelId);
      if (!spiciness) {
        validationErrors.push(`Item ${idx + 1}: Level kepedasan tidak ditemukan.`);
        return null;
      }

      const itemToppings = (item.toppingIds || []).map((tid) => {
        const topping = toppingMap.get(tid);
        if (!topping) {
          validationErrors.push(`Item ${idx + 1}: Topping ID ${tid} tidak ditemukan.`);
          return null;
        }
        if (!topping.isAvailable) {
          validationErrors.push(`Item ${idx + 1}: Topping "${topping.nama}" tidak tersedia.`);
          return null;
        }
        return topping;
      });

      if (itemToppings.some((t) => t === null)) return null;

      const toppingTotal = itemToppings.reduce((sum, t) => sum + t!.harga, 0);
      const itemSubtotal = (product.harga + spiciness.extraHarga + toppingTotal) * item.quantity;
      orderSubtotal += itemSubtotal;

      return {
        quantity: item.quantity,
        productName: product.nama,
        price: product.harga,
        spicinessLabel: spiciness.label,
        spicinessPrice: spiciness.extraHarga,
        note: item.catatan || null,
        subtotal: itemSubtotal,
        productId: product.id,
        spicinessLevelId: spiciness.id,
        toppings: itemToppings.map((t) => ({
          toppingName: t!.nama,
          price: t!.harga,
          toppingId: t!.id,
        })),
      };
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, message: validationErrors.join(" ") },
        { status: 400 }
      );
    }

    // Filter out nulls (shouldn't happen if validation passed)
    const validItems = processedItems.filter((i) => i !== null);

    // 5. Create order in transaction
    const orderNumber = await generateOrderNumber();
    const deliveryFee = 0; // No delivery system yet
    const total = orderSubtotal + deliveryFee;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerName: body.customerName.trim(),
          phone: body.phone.trim(),
          orderType: body.orderType,
          note: body.note?.trim() || null,
          subtotal: orderSubtotal,
          deliveryFee,
          total,
          status: "PENDING",
          paymentStatus: "UNPAID",
          userId: authUser.id,
          items: {
            create: validItems.map((item) => ({
              quantity: item.quantity,
              productName: item.productName,
              price: item.price,
              spicinessLabel: item.spicinessLabel,
              spicinessPrice: item.spicinessPrice,
              note: item.note,
              subtotal: item.subtotal,
              productId: item.productId,
              spicinessLevelId: item.spicinessLevelId,
              toppings: {
                create: item.toppings.map((tp) => ({
                  toppingName: tp.toppingName,
                  price: tp.price,
                  toppingId: tp.toppingId,
                })),
              },
            })),
          },
        },
        include: {
          items: {
            include: {
              toppings: true,
            },
          },
        },
      });

      // Update user phone if not set yet
      if (body.phone && body.phone.trim()) {
        await tx.user.update({
          where: { id: authUser.id },
          data: { phone: body.phone.trim() },
        });
      }

      return newOrder;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pesanan berhasil dibuat!",
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server saat membuat pesanan." },
      { status: 500 }
    );
  }
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const authUser = await getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Admin sees all, regular user sees only their own
    const whereClause = authUser.role === "Admin" ? {} : { userId: authUser.id };

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        orderType: true,
        total: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        items: {
          select: { id: true },
        },
      },
    });

    // Add item count
    const ordersWithCount = orders.map((order) => ({
      ...order,
      itemCount: order.items.length,
      items: undefined,
    }));

    return NextResponse.json({ success: true, data: ordersWithCount });
  } catch (err) {
    console.error("List orders error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data pesanan." },
      { status: 500 }
    );
  }
}
