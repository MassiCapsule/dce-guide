// Types pour le plan JSON structuré

export interface PlanH1 {
  titre: string;
}

export interface PlanSection {
  mots_cles?: string[];
  nombre_mots?: number;
  brief?: string;
  "Titre H2"?: string;
  structure?: string;
}

export interface PlanProductPart {
  brief: string;
  h2?: string;
  points?: string[];
}

export interface PlanProduct {
  asin: string;
  "Titre H2": string;
  Brief: string;
  parties: {
    situation: PlanProductPart;
    atouts: PlanProductPart;
    valeur: PlanProductPart;
    evidence: PlanProductPart;
  };
  mots_cles: string[];
  mots_total: number;
  prix: string;
  url: string;
}

export interface PlanJson {
  H1: PlanH1;
  chapo: PlanSection;
  introduction: PlanSection;
  criteres: PlanSection;
  produits: PlanProduct[];
  faq: PlanSection;
}

/**
 * Parse le planJson depuis la DB (string JSON) vers l'objet typé.
 * Retourne null si vide ou invalide.
 */
export function parsePlanJson(raw: string | null | undefined): PlanJson | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    // Validation minimale : vérifier que les clés principales existent
    if (!parsed.H1 || !parsed.produits || !Array.isArray(parsed.produits)) {
      return null;
    }
    return parsed as PlanJson;
  } catch {
    return null;
  }
}
