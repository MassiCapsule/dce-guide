import { Header } from "@/components/layout/header";
import { GuideForm } from "@/components/guides/guide-form";

export default function NouveauGuidePage() {
  return (
    <>
      <Header title="Nouveau guide d'achat" />
      <main className="p-6">
        <GuideForm />
      </main>
    </>
  );
}
