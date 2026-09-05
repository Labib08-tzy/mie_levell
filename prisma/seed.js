// ============================================================
// Mie Level - Prisma Seed File
// Mengisi database dengan data awal:
//   - Categories (3 kategori)
//   - Products (11 produk dari data demo UI)
//   - SpicinessLevels (6 level 0-5)
//   - Toppings (5 topping)
// ============================================================

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...\n");

  // ============================================================
  // 1. CATEGORIES
  // ============================================================
  console.log("📦 Seeding categories...");

  const catMie = await prisma.category.upsert({
    where: { nama: "Mie Pedas" },
    update: {},
    create: { nama: "Mie Pedas", icon: "🍜" },
  });

  const catDimsum = await prisma.category.upsert({
    where: { nama: "Dimsum & Cemilan" },
    update: {},
    create: { nama: "Dimsum & Cemilan", icon: "🥟" },
  });

  const catMinuman = await prisma.category.upsert({
    where: { nama: "Minuman Segar" },
    update: {},
    create: { nama: "Minuman Segar", icon: "🥤" },
  });

  console.log(`   ✅ Created ${3} categories\n`);

  // ============================================================
  // 2. PRODUCTS
  // ============================================================
  console.log("🍽️  Seeding products...");

  // Buat mapping categoryId berdasarkan nama yang sudah di-upsert
  const allCategories = await prisma.category.findMany();
  const catMap = Object.fromEntries(allCategories.map((c) => [c.nama, c.id]));

  const productsData = [
    // --- Mie Pedas ---
    { nama: "Mie Gacor",       deskripsi: "Pedas Asin Gurih",           harga: 14000, gambarUrl: "/image/mie_gacoan.png",    rating: 4.9, badge: "Favorite",   stok: 50, isAvailable: true, categoryId: catMap["Mie Pedas"] },
    { nama: "Mie Hompimpa",    deskripsi: "Pedas Manis Gurih",          harga: 14000, gambarUrl: "/image/mie_hompimpa.png",  rating: 4.9, badge: "Best Seller", stok: 50, isAvailable: true, categoryId: catMap["Mie Pedas"] },
    { nama: "Mie Suit",        deskripsi: "Gurih Original (Non-Pedas)", harga: 12000, gambarUrl: "/image/mie_suit.png",      rating: 4.8, badge: "Original",    stok: 40, isAvailable: true, categoryId: catMap["Mie Pedas"] },
    // --- Dimsum & Cemilan ---
    { nama: "Udang Keju",      deskripsi: "Keju Lumer Crispy",          harga: 13000, gambarUrl: "/image/udang_keju.png",    rating: 5.0, badge: "Must Try",   stok: 30, isAvailable: true, categoryId: catMap["Dimsum & Cemilan"] },
    { nama: "Udang Rambutan",  deskripsi: "Super Crispy",               harga: 13000, gambarUrl: "/image/udang_rambutan.png",rating: 4.9, badge: "Favorite",   stok: 30, isAvailable: true, categoryId: catMap["Dimsum & Cemilan"] },
    { nama: "Lumpia Udang",    deskripsi: "Kulit Tahu Gurih",           harga: 13000, gambarUrl: "/image/lumpia.png",        rating: 4.8, badge: "Must Try",   stok: 25, isAvailable: true, categoryId: catMap["Dimsum & Cemilan"] },
    { nama: "Pangsit Goreng",  deskripsi: "Renyah Maksimal",            harga: 11000, gambarUrl: "/image/pangsit.png",       rating: 4.8, badge: "Favorite",   stok: 40, isAvailable: true, categoryId: catMap["Dimsum & Cemilan"] },
    // --- Minuman Segar ---
    { nama: "Es Gobak Sodor",  deskripsi: "Es Buah Spesial",            harga: 10000, gambarUrl: "/image/es_gobaksodor.png", rating: 4.9, badge: "Best Seller", stok: 60, isAvailable: true, categoryId: catMap["Minuman Segar"] },
    { nama: "Es Jeruk (Orange)",deskripsi: "Perasan Jeruk Asli",        harga:  7000, gambarUrl: "/image/orange.png",        rating: 4.8, badge: "Original",    stok: 60, isAvailable: true, categoryId: catMap["Minuman Segar"] },
    { nama: "Es Teh Manis",    deskripsi: "Teh Tubruk Segar",           harga:  5000, gambarUrl: "/image/esteh.png",         rating: 4.7, badge: "Original",    stok: 80, isAvailable: true, categoryId: catMap["Minuman Segar"] },
    { nama: "Air Mineral",     deskripsi: "Pegunungan Murni",            harga:  4000, gambarUrl: "/image/air.png",           rating: 4.9, badge: "Original",    stok: 100,isAvailable: true, categoryId: catMap["Minuman Segar"] },
  ];

  await prisma.product.createMany({ data: productsData, skipDuplicates: true });
  console.log(`   ✅ Created/skipped ${productsData.length} products\n`);


  // ============================================================
  // 3. SPICINESS LEVELS
  // ============================================================
  console.log("🌶️  Seeding spiciness levels...");

  const spicinessData = [
    { level: 0, label: "Level 0 - Tidak Pedas",   deskripsi: "Tanpa rasa pedas sama sekali, cocok untuk semua kalangan.", extraHarga: 0 },
    { level: 1, label: "Level 1 - Pedas Ringan",   deskripsi: "Sedikit pedas, cocok untuk pemula.",                        extraHarga: 0 },
    { level: 2, label: "Level 2 - Pedas Sedang",   deskripsi: "Pedas yang pas, nikmat di lidah.",                          extraHarga: 0 },
    { level: 3, label: "Level 3 - Pedas Mantap",   deskripsi: "Pedas mantap, terasa di tenggorokan.",                     extraHarga: 0 },
    { level: 4, label: "Level 4 - Pedas Ekstrem",  deskripsi: "Sangat pedas, hanya untuk pemberani!",                     extraHarga: 0 },
    { level: 5, label: "Level 5 - Pedas Iblis 🔥", deskripsi: "Level tertinggi. Berani coba?",                            extraHarga: 0 },
  ];

  for (const s of spicinessData) {
    await prisma.spicinessLevel.upsert({
      where: { level: s.level },
      update: s,
      create: s,
    });
  }

  console.log(`   ✅ Created/updated ${spicinessData.length} spiciness levels\n`);

  // ============================================================
  // 4. TOPPINGS
  // ============================================================
  console.log("🥚  Seeding toppings...");

  const toppingsData = [
    { nama: "Telur",         harga: 3000, isAvailable: true },
    { nama: "Keju",          harga: 4000, isAvailable: true },
    { nama: "Pangsit Goreng",harga: 3000, isAvailable: true },
    { nama: "Ceker",         harga: 5000, isAvailable: true },
    { nama: "Bakso",         harga: 4000, isAvailable: true },
  ];

  for (const t of toppingsData) {
    await prisma.topping.upsert({
      where: { nama: t.nama },
      update: t,
      create: t,
    });
  }

  console.log(`   ✅ Created/updated ${toppingsData.length} toppings\n`);

  // ============================================================
  // SUMMARY
  // ============================================================
  const counts = {
    categories:     await prisma.category.count(),
    products:       await prisma.product.count(),
    spicinessLevels:await prisma.spicinessLevel.count(),
    toppings:       await prisma.topping.count(),
  };

  console.log("✅ Seed selesai!\n");
  console.log("📊 Database sekarang berisi:");
  console.log(`   • Categories     : ${counts.categories}`);
  console.log(`   • Products       : ${counts.products}`);
  console.log(`   • SpicinessLevels: ${counts.spicinessLevels}`);
  console.log(`   • Toppings       : ${counts.toppings}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
