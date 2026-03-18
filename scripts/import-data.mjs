import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const products = JSON.parse(
  readFileSync(join(__dirname, "../data/fiche-produit.json"), "utf-8")
).flat();

const reviews = JSON.parse(
  readFileSync(join(__dirname, "../data/Avis-produit.json"), "utf-8")
);

const keywordsRaw = readFileSync(
  join(__dirname, "../data/mots clés pour - meilleur aspirateur balai.tx.txt"),
  "utf-8"
);

// Parse keywords (TSV: Expression \t Occurrences \t Min \t Max)
const keywords = keywordsRaw
  .split("\n")
  .slice(1) // skip header
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const parts = line.split("\t");
    return {
      keyword: parts[0]?.trim(),
      minOccurrences: parseInt(parts[2]) || 0,
      maxOccurrences: parseInt(parts[3]) || 0,
    };
  })
  .filter((k) => k.keyword);

async function main() {
  // 1. Récupérer ou créer un Media
  let media = await prisma.media.findFirst();
  if (!media) {
    media = await prisma.media.create({
      data: {
        name: "Blog Test Produit",
        toneDescription: "Expert et accessible, inspire confiance sans jargon excessif.",
        writingStyle: "Phrases courtes et percutantes. Vouvoiement.",
        doRules: JSON.stringify(["Inclure des listes à puces"]),
        dontRules: JSON.stringify(["Ne jamais mentionner Amazon"]),
        productStructureTemplate: "<h2>{{keyword}} : notre avis complet</h2>",
        defaultProductWordCount: 800,
      },
    });
    console.log("✓ Media créé");
  } else {
    console.log("✓ Media existant utilisé :", media.name);
  }

  // 2. Créer les ProductIntelligence
  const intelligenceMap = {};
  for (const product of products) {
    const productReviews = reviews.filter((r) => r.productAsin === product.asin);
    const price = product.price?.value
      ? `${product.price.value} ${product.price.currency}`
      : "";
    const imageUrl =
      product.thumbnailImage || product.highResolutionImages?.[0] || "";

    const intel = await prisma.productIntelligence.upsert({
      where: { asin_marketplace: { asin: product.asin, marketplace: "amazon.fr" } },
      create: {
        asin: product.asin,
        marketplace: "amazon.fr",
        productTitle: product.title || "",
        productBrand: product.brand || "",
        productPrice: price,
        productImageUrl: imageUrl,
        rawProductJson: JSON.stringify(product),
        rawReviewsJson: JSON.stringify(productReviews),
        reviewCount: productReviews.length,
        analyzed: false,
      },
      update: {
        productTitle: product.title || "",
        productBrand: product.brand || "",
        productPrice: price,
        productImageUrl: imageUrl,
        rawProductJson: JSON.stringify(product),
        rawReviewsJson: JSON.stringify(productReviews),
        reviewCount: productReviews.length,
      },
    });

    intelligenceMap[product.asin] = intel.id;
    console.log(`✓ ProductIntelligence : ${product.asin} — ${product.title?.slice(0, 50)}`);
  }

  // 3. Créer le Guide
  const guide = await prisma.guide.create({
    data: {
      title: "Meilleur aspirateur balai",
      status: "complete",
      mediaId: media.id,
    },
  });
  console.log(`✓ Guide créé : ${guide.id}`);

  // 4. Créer les GuideProduct
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    await prisma.guideProduct.create({
      data: {
        guideId: guide.id,
        intelligenceId: intelligenceMap[product.asin],
        position: i + 1,
      },
    });
  }
  console.log(`✓ ${products.length} GuideProducts créés`);

  // 5. Créer les GuideKeywords
  for (const kw of keywords) {
    await prisma.guideKeyword.create({
      data: {
        guideId: guide.id,
        keyword: kw.keyword,
        minOccurrences: kw.minOccurrences,
        maxOccurrences: kw.maxOccurrences,
      },
    });
  }
  console.log(`✓ ${keywords.length} GuideKeywords créés`);

  console.log("\n✅ Import terminé !");
  console.log(`   Guide ID : ${guide.id}`);
  console.log(`   → http://localhost:3000/guides/${guide.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
