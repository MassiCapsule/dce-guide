import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { MediaForm } from "@/components/medias/media-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMediaPage({ params }: PageProps) {
  const { id } = await params;

  const media = await prisma.media.findUnique({ where: { id } });

  if (!media) {
    notFound();
  }

  return (
    <>
      <Header title={`Modifier ${media.name}`} />
      <main className="p-6 max-w-3xl">
        <MediaForm media={media} />
      </main>
    </>
  );
}
