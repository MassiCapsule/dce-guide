"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MetaFieldsProps {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  imageCaption: string;
  onChange: (field: string, value: string) => void;
}

export function MetaFields({
  slug,
  metaTitle,
  metaDescription,
  imageCaption,
  onChange,
}: MetaFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 p-4 border rounded-md bg-muted/10">
      {/* Row 1: Slug + Meta title */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Slug</Label>
          <Input
            value={slug}
            onChange={(e) => onChange("slug", e.target.value)}
            className="font-mono"
          />
        </div>
        <div>
          <Label className="text-xs">Meta title</Label>
          <Input
            value={metaTitle}
            onChange={(e) => onChange("metaTitle", e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-0.5">
            {metaTitle.length} / 60
          </p>
        </div>
      </div>

      {/* Row 2: Meta description */}
      <div>
        <Label className="text-xs">Meta description</Label>
        <Textarea
          value={metaDescription}
          onChange={(e) => onChange("metaDescription", e.target.value)}
          rows={2}
        />
        <p className="text-xs text-muted-foreground mt-0.5">
          {metaDescription.length} / 155
        </p>
      </div>

      {/* Row 3: Légende image principale */}
      <div>
        <Label className="text-xs">Légende image principale</Label>
        <Input
          value={imageCaption}
          onChange={(e) => onChange("imageCaption", e.target.value)}
        />
      </div>
    </div>
  );
}
