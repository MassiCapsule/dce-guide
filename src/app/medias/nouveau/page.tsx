import { Header } from "@/components/layout/header";
import { MediaForm } from "@/components/medias/media-form";

export default function NouveauMediaPage() {
  return (
    <>
      <Header title="Nouveau media" />
      <main className="p-6 max-w-3xl">
        <MediaForm />
      </main>
    </>
  );
}
