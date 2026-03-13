export interface KeywordSpec {
  keyword: string;
  minOccurrences: number;
  maxOccurrences: number;
}

export interface ProductKeywordAllocation {
  keyword: string;
  targetCount: number;
}

export interface ProductAllocation {
  position: number;
  keywords: ProductKeywordAllocation[];
}

/**
 * Distribue les mots-cles d'un guide entre les produits.
 * Respecte les bornes min/max et evite la concentration.
 */
export function distributeKeywords(
  keywords: KeywordSpec[],
  productCount: number
): ProductAllocation[] {
  // Initialize allocations for each product
  const allocations: ProductAllocation[] = [];
  for (let i = 0; i < productCount; i++) {
    allocations.push({ position: i + 1, keywords: [] });
  }

  for (const kw of keywords) {
    const target = Math.round((kw.minOccurrences + kw.maxOccurrences) / 2);
    const maxPerProduct = Math.max(1, Math.ceil(kw.maxOccurrences * 0.4));
    const idealPerProduct = Math.max(1, Math.ceil(target / productCount));

    // Assign ideal count, capped by maxPerProduct
    const counts: number[] = [];
    let remaining = target;

    for (let i = 0; i < productCount; i++) {
      const assign = Math.min(idealPerProduct, maxPerProduct, remaining);
      counts.push(assign);
      remaining -= assign;
    }

    // Distribute leftover across products that still have room
    let idx = 0;
    while (remaining > 0) {
      if (counts[idx] < maxPerProduct) {
        counts[idx]++;
        remaining--;
      }
      idx = (idx + 1) % productCount;
      // Safety: if no product can take more, break
      if (counts.every((c) => c >= maxPerProduct)) break;
    }

    // Validate global total is within min/max
    let total = counts.reduce((s, c) => s + c, 0);
    // If total < min, boost products starting from the least loaded
    while (total < kw.minOccurrences) {
      const minIdx = counts.indexOf(Math.min(...counts));
      if (counts[minIdx] < maxPerProduct) {
        counts[minIdx]++;
        total++;
      } else {
        break;
      }
    }
    // If total > max, reduce products starting from the most loaded
    while (total > kw.maxOccurrences) {
      const maxIdx = counts.indexOf(Math.max(...counts));
      if (counts[maxIdx] > 0) {
        counts[maxIdx]--;
        total--;
      } else {
        break;
      }
    }

    // Assign to allocations
    for (let i = 0; i < productCount; i++) {
      if (counts[i] > 0) {
        allocations[i].keywords.push({
          keyword: kw.keyword,
          targetCount: counts[i],
        });
      }
    }
  }

  return allocations;
}
