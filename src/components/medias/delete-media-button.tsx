"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DeleteMediaButtonProps {
  mediaId: string;
  mediaName: string;
}

export function DeleteMediaButton({
  mediaId,
  mediaName,
}: DeleteMediaButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Supprimer le media "${mediaName}" ?`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/medias/${mediaId}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      toast({
        title: "Media supprime",
        description: `Le media "${mediaName}" a ete supprime.`,
      });

      router.refresh();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={deleting}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
