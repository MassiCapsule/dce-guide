"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface Product {
  id: string;
  asin: string;
  title: string;
  brand: string;
  price: string;
  imageUrl: string;
  reviewCount: number;
  rating: number;
  status: "done" | "pending" | "error";
}

interface TabProductsProps {
  products: Product[];
}

function StatusBadge({ status }: { status: Product["status"] }) {
  if (status === "done") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="w-3 h-3" />
        Récupéré
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="flex items-center gap-1 text-xs text-yellow-600">
        <Clock className="w-3 h-3" />
        En attente
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="w-3 h-3" />
      Erreur
    </span>
  );
}

export function TabProducts({ products }: TabProductsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {products.length} produits
        </span>
        <Button size="sm">Lancer la récupération</Button>
      </div>

      {products.map((product, index) => (
        <Card key={product.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <span className="text-sm text-muted-foreground w-6">
              {index + 1}.
            </span>
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-16 h-16 object-cover rounded-md border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{product.title}</p>
              <p className="text-xs text-muted-foreground">
                {product.brand} · {product.asin}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs">{product.price}</span>
                <span className="text-xs text-muted-foreground">
                  ★ {product.rating} ({product.reviewCount} avis)
                </span>
              </div>
            </div>
            <StatusBadge status={product.status} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
