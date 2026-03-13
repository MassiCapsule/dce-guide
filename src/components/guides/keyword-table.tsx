"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface GuideKeyword {
  keyword: string;
  minOccurrences: number;
  maxOccurrences: number;
}

interface ProductAllocation {
  position: number;
  productTitle: string;
  keywords: { keyword: string; targetCount: number }[];
}

interface KeywordTableProps {
  keywords: GuideKeyword[];
  allocations: ProductAllocation[];
}

export function KeywordTable({ keywords, allocations }: KeywordTableProps) {
  if (keywords.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Repartition des mots-cles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                  Mot-cle
                </th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                  Min
                </th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                  Max
                </th>
                {allocations.map((a) => (
                  <th
                    key={a.position}
                    className="text-center py-2 px-2 font-medium text-muted-foreground"
                    title={a.productTitle}
                  >
                    P{a.position}
                  </th>
                ))}
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw) => {
                const total = allocations.reduce((sum, a) => {
                  const found = a.keywords.find(
                    (k) => k.keyword === kw.keyword
                  );
                  return sum + (found?.targetCount || 0);
                }, 0);

                const inBounds =
                  total >= kw.minOccurrences && total <= kw.maxOccurrences;

                return (
                  <tr key={kw.keyword} className="border-b last:border-0">
                    <td className="py-2 px-2 font-medium">{kw.keyword}</td>
                    <td className="py-2 px-2 text-center text-muted-foreground">
                      {kw.minOccurrences}
                    </td>
                    <td className="py-2 px-2 text-center text-muted-foreground">
                      {kw.maxOccurrences}
                    </td>
                    {allocations.map((a) => {
                      const found = a.keywords.find(
                        (k) => k.keyword === kw.keyword
                      );
                      return (
                        <td key={a.position} className="py-2 px-2 text-center">
                          {found?.targetCount ? (
                            <Badge variant="secondary" className="text-xs">
                              {found.targetCount}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center">
                      <Badge
                        variant={inBounds ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {total}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
