import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.media.count();
  if (count > 0) {
    console.log("Seed: media deja present, skip.");
    return;
  }

  await prisma.media.create({
    data: {
      name: "Blog Test Produit",
      toneDescription:
        "Expert et accessible, inspire confiance sans jargon excessif. Ton professionnel mais chaleureux.",
      writingStyle:
        "Phrases courtes et percutantes. Paragraphes de 2-3 phrases max. Vouvoiement. Vocabulaire technique accessible.",
      doRules: JSON.stringify([
        "Utiliser le mot-cle principal dans le H2 principal",
        "Inclure des listes a puces pour les avantages et inconvenients",
        "Citer des usages concrets issus des avis reformules",
        "Mentionner 1 a 2 points faibles comme compromis acceptables",
        "Structurer avec des sous-titres H2/H3 clairs",
        "Integrer le SEO naturellement sans bourrage de mots-cles",
      ]),
      dontRules: JSON.stringify([
        "Ne jamais mentionner Amazon ou le prix exact",
        "Ne pas utiliser de superlatifs non justifies (meilleur, parfait, incroyable)",
        "Ne jamais copier-coller des avis bruts",
        "Eviter le ton alarmiste ou les promesses non verifiables",
        "Ne pas depasser 3 paragraphes consecutifs sans element visuel (liste, sous-titre)",
      ]),
      productStructureTemplate: [
        "<h2>{{keyword}} : notre avis complet</h2>",
        "<!-- Donnees generales : presentation du produit, positionnement -->",
        "",
        "<h3>Points forts</h3>",
        "<!-- Liste a puces des qualites confirmees par les utilisateurs -->",
        "",
        "<h3>Points faibles</h3>",
        "<!-- 1-2 limites presentees comme compromis acceptables -->",
        "",
        "<h3>Experience utilisateur</h3>",
        "<!-- Synthese des retours reels, citations reformulees -->",
        "",
        "<h3>Fonctionnalites cles</h3>",
        "<!-- Caracteristiques techniques importantes -->",
        "",
        "<h3>Pour qui est fait ce produit ?</h3>",
        "<!-- Profils d'acheteurs ideaux -->",
        "",
        "<h3>A qui ne convient-il pas ?</h3>",
        "<!-- Profils pour lesquels ce n'est pas le bon choix -->",
      ].join("\n"),
      defaultProductWordCount: 800,
    },
  });

  console.log("Seed: media par defaut cree.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
