import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteMediaButton } from "@/components/medias/delete-media-button";

export default async function MediasPage() {
  const medias = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Header title="Medias">
        <Button asChild>
          <Link href="/medias/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau media
          </Link>
        </Button>
      </Header>

      <main className="p-6">
        {medias.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                Aucun media configure. Creez votre premier media pour commencer.
              </p>
              <Button asChild>
                <Link href="/medias/nouveau">
                  <Plus className="mr-2 h-4 w-4" />
                  Creer un media
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {medias.map((media) => (
              <Card key={media.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{media.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {media.toneDescription || "Pas de description du ton"}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/medias/${media.id}`}>
                        <Pencil className="mr-2 h-3 w-3" />
                        Modifier
                      </Link>
                    </Button>
                    <DeleteMediaButton
                      mediaId={media.id}
                      mediaName={media.name}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
