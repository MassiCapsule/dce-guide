"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const MODELS = [
  { value: "gpt-5.4", label: "GPT-5.4", provider: "OpenAI" },
  { value: "gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "Anthropic" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4", provider: "Anthropic" },
  { value: "claude-haiku-4-20250414", label: "Claude Haiku 4", provider: "Anthropic" },
];

const OPENAI_MODELS = MODELS.filter((m) => m.provider === "OpenAI");
const ANTHROPIC_MODELS = MODELS.filter((m) => m.provider === "Anthropic");

interface MediaFormProps {
  media?: {
    id: string;
    name: string;
    description: string;
    toneDescription: string;
    writingStyle: string;
    doRules: string;
    dontRules: string;
    productStructureTemplate: string;
    defaultProductWordCount: number;
    promptPlan: string;
    planOutputStructure: string;
    modelPlan: string;
    forbiddenWords: string;
  };
}

export function MediaForm({ media }: MediaFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditing = !!media;

  const [name, setName] = useState(media?.name ?? "");
  const [description, setDescription] = useState(media?.description ?? "");
  const [toneDescription, setToneDescription] = useState(
    media?.toneDescription ?? ""
  );
  const [writingStyle, setWritingStyle] = useState(media?.writingStyle ?? "");
  const [doRules, setDoRules] = useState(() => {
    if (!media?.doRules) return "";
    try {
      return JSON.parse(media.doRules).join("\n");
    } catch {
      return media.doRules;
    }
  });
  const [dontRules, setDontRules] = useState(() => {
    if (!media?.dontRules) return "";
    try {
      return JSON.parse(media.dontRules).join("\n");
    } catch {
      return media.dontRules;
    }
  });
  const [productStructureTemplate, setProductStructureTemplate] = useState(
    media?.productStructureTemplate ?? ""
  );
  const [defaultProductWordCount, setDefaultProductWordCount] = useState(
    media?.defaultProductWordCount ?? 800
  );
  const [promptPlan, setPromptPlan] = useState(media?.promptPlan ?? "");
  const [planOutputStructure, setPlanOutputStructure] = useState(media?.planOutputStructure ?? "");
  const [modelPlan, setModelPlan] = useState(media?.modelPlan || "__global__");
  const [forbiddenWords, setForbiddenWords] = useState(() => {
    if (!media?.forbiddenWords) return "";
    try {
      return JSON.parse(media.forbiddenWords).join("\n");
    } catch {
      return media.forbiddenWords;
    }
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const doRulesArray = doRules
        .split("\n")
        .map((r: string) => r.trim())
        .filter((r: string) => r.length > 0);
      const dontRulesArray = dontRules
        .split("\n")
        .map((r: string) => r.trim())
        .filter((r: string) => r.length > 0);

      const forbiddenWordsArray = forbiddenWords
        .split("\n")
        .map((r: string) => r.trim())
        .filter((r: string) => r.length > 0);

      const body = {
        name,
        description,
        toneDescription,
        writingStyle,
        doRules: JSON.stringify(doRulesArray),
        dontRules: JSON.stringify(dontRulesArray),
        forbiddenWords: JSON.stringify(forbiddenWordsArray),
        productStructureTemplate,
        defaultProductWordCount,
        promptPlan,
        planOutputStructure,
        modelPlan: modelPlan === "__global__" ? "" : modelPlan,
      };

      const url = isEditing ? `/api/medias/${media.id}` : "/api/medias";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      toast({
        title: isEditing ? "Media mis a jour" : "Media cree",
        description: `Le media "${name}" a ete ${isEditing ? "mis a jour" : "cree"} avec succes.`,
      });

      router.push("/medias");
      router.refresh();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Modifier le media" : "Nouveau media"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="name">Nom</Label>
              <Badge variant="secondary" className="font-mono text-xs">{"{media.name}"}</Badge>
            </div>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mon Blog Tech"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez ce média en quelques mots..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="toneDescription">Description du ton</Label>
              <Badge variant="secondary" className="font-mono text-xs">{"{media.toneDescription}"}</Badge>
            </div>
            <Textarea
              id="toneDescription"
              value={toneDescription}
              onChange={(e) => setToneDescription(e.target.value)}
              placeholder="Decrivez le ton editorial souhaite..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="writingStyle">Style d&apos;ecriture</Label>
              <Badge variant="secondary" className="font-mono text-xs">{"{media.writingStyle}"}</Badge>
            </div>
            <Textarea
              id="writingStyle"
              value={writingStyle}
              onChange={(e) => setWritingStyle(e.target.value)}
              placeholder="Decrivez le style d'ecriture..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="doRules">Regles a suivre</Label>
              <Badge variant="secondary" className="font-mono text-xs">{"{doRules}"}</Badge>
            </div>
            <Textarea
              id="doRules"
              value={doRules}
              onChange={(e) => setDoRules(e.target.value)}
              placeholder="Une regle par ligne"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Une regle par ligne
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="dontRules">Regles a eviter</Label>
              <Badge variant="secondary" className="font-mono text-xs">{"{dontRules}"}</Badge>
            </div>
            <Textarea
              id="dontRules"
              value={dontRules}
              onChange={(e) => setDontRules(e.target.value)}
              placeholder="Une regle par ligne"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Une regle par ligne
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="forbiddenWords">Interdits lexicaux</Label>
              <Badge variant="secondary" className="font-mono text-xs">{"{forbiddenWords}"}</Badge>
            </div>
            <Textarea
              id="forbiddenWords"
              value={forbiddenWords}
              onChange={(e) => setForbiddenWords(e.target.value)}
              placeholder="Un mot ou expression par ligne"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Mots et expressions a ne jamais utiliser dans les contenus generes (un par ligne)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultProductWordCount">
              Nombre de mots par defaut
            </Label>
            <Input
              id="defaultProductWordCount"
              type="number"
              value={defaultProductWordCount}
              onChange={(e) =>
                setDefaultProductWordCount(parseInt(e.target.value) || 0)
              }
              min={100}
              max={5000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelPlan">Modèle IA pour le plan</Label>
            <Select value={modelPlan} onValueChange={setModelPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Config globale (Paramètres)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__">Config globale (Paramètres)</SelectItem>
                <SelectGroup>
                  <SelectLabel>OpenAI</SelectLabel>
                  {OPENAI_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Anthropic</SelectLabel>
                  {ANTHROPIC_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Si vide, utilise le modèle configuré dans Paramètres.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promptPlan">Prompt generation du plan</Label>
            <Textarea
              id="promptPlan"
              value={promptPlan}
              onChange={(e) => setPromptPlan(e.target.value)}
              placeholder="Placeholders disponibles : #NomMedia, #MotClePrincipal, #NombreMots, #Criteres, #ResumeProduits, #MotsCles"
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Si vide, le prompt par defaut sera utilise.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="planOutputStructure">Structure de sortie du plan</Label>
            <Textarea
              id="planOutputStructure"
              value={planOutputStructure}
              onChange={(e) => setPlanOutputStructure(e.target.value)}
              placeholder="Instructions de format de sortie (HTML + JSON). Ajouté automatiquement après le prompt plan."
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Format de sortie (HTML + JSON) concaténé après le prompt plan. Commun ou personnalisable par média.
            </p>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Enregistrement..."
                : isEditing
                  ? "Enregistrer"
                  : "Creer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/medias")}
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
