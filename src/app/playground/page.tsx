"use client";

import { useState, useEffect } from "react";
import { Loader2, Eye, Code, FlaskConical, FileText, Tags, Type } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODELS = [
  { value: "gpt-5.4", label: "GPT-5.4", provider: "OpenAI" },
  { value: "gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "Anthropic" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4", provider: "Anthropic" },
  { value: "claude-haiku-4-20250414", label: "Claude Haiku 4", provider: "Anthropic" },
];

const OPENAI_MODELS = MODELS.filter((m) => m.provider === "OpenAI");
const ANTHROPIC_MODELS = MODELS.filter((m) => m.provider === "Anthropic");

interface PromptSegment {
  type: "static" | "variable";
  text: string;
  name?: string;
}

interface MediaOption {
  id: string;
  name: string;
  defaultProductWordCount: number;
}

function ModelSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
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
  );
}

function AnnotatedPromptDisplay({ segments }: { segments: PromptSegment[] }) {
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
      {segments.map((seg, i) =>
        seg.type === "static" ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <span key={i} className="inline relative">
            <span className="text-[10px] font-sans font-medium text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-1 rounded-t">
              {seg.name}
            </span>
            <span className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-b px-1 text-violet-900 dark:text-violet-100">
              {seg.text}
            </span>
          </span>
        )
      )}
    </div>
  );
}

function HtmlResultCard({
  title,
  html,
  loading,
  loadingMessage,
  tokenInfo,
  extra,
}: {
  title: string;
  html: string;
  loading: boolean;
  loadingMessage: string;
  tokenInfo: { promptTokens: number; completionTokens: number } | null;
  extra?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-3">
            {tokenInfo && (
              <p className="text-xs text-muted-foreground">
                Tokens : {tokenInfo.promptTokens} prompt + {tokenInfo.completionTokens} completion
              </p>
            )}
            {extra}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">{loadingMessage}</span>
          </div>
        ) : (
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview" className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> Preview
              </TabsTrigger>
              <TabsTrigger value="source" className="flex items-center gap-1">
                <Code className="w-3 h-3" /> Code source
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <div
                className="prose prose-sm max-w-none dark:prose-invert p-4 border rounded-lg"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </TabsContent>
            <TabsContent value="source">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                {html}
              </pre>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Onglet Fiche Produit ───────────────────────────────────────────────────

function TabFicheProduit({ medias }: { medias: MediaOption[] }) {
  const [intelligenceId, setIntelligenceId] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [wordCount, setWordCount] = useState<number>(800);
  const [planSection, setPlanSection] = useState("");
  const [model, setModel] = useState("gpt-5.4");

  const [segments, setSegments] = useState<PromptSegment[]>([]);
  const [fullPrompt, setFullPrompt] = useState("");

  const [generatedHtml, setGeneratedHtml] = useState("");
  const [tokenInfo, setTokenInfo] = useState<{ promptTokens: number; completionTokens: number } | null>(null);

  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [error, setError] = useState("");

  const [generatedHtmlV2, setGeneratedHtmlV2] = useState("");
  const [tokenInfoV2, setTokenInfoV2] = useState<{ promptTokens: number; completionTokens: number } | null>(null);
  const [loadingHumanize, setLoadingHumanize] = useState(false);
  const [showBadges, setShowBadges] = useState(true);

  // Init media
  useEffect(() => {
    if (medias.length > 0 && !mediaId) {
      setMediaId(medias[0].id);
      setWordCount(medias[0].defaultProductWordCount || 800);
    }
  }, [medias, mediaId]);

  const handleMediaChange = (id: string) => {
    setMediaId(id);
    const m = medias.find((m) => m.id === id);
    if (m) setWordCount(m.defaultProductWordCount || 800);
  };

  const handleLoadPrompt = async () => {
    if (!intelligenceId.trim() || !mediaId) {
      setError("ID Produit et Média sont requis");
      return;
    }
    setError("");
    setLoadingPrompt(true);
    try {
      const res = await fetch("/api/playground/build-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intelligenceId: intelligenceId.trim(),
          mediaId,
          keyword: keyword.trim() || undefined,
          wordCount,
          planSection: planSection.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur");
        return;
      }
      const data = await res.json();
      setSegments(data.segments);
      setFullPrompt(data.fullPrompt);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (!fullPrompt.trim()) {
      setError("Charge d'abord le prompt");
      return;
    }
    setError("");
    setLoadingGenerate(true);
    setGeneratedHtml("");
    setTokenInfo(null);
    try {
      const res = await fetch("/api/playground/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, model }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur de génération");
        return;
      }
      const data = await res.json();
      setGeneratedHtml(data.html);
      setTokenInfo({ promptTokens: data.promptTokens, completionTokens: data.completionTokens });
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleHumanize = async () => {
    if (!generatedHtml || !mediaId) return;
    setError("");
    setLoadingHumanize(true);
    setGeneratedHtmlV2("");
    setTokenInfoV2(null);
    try {
      const buildRes = await fetch("/api/playground/build-humanize-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlV1: generatedHtml, mediaId }),
      });
      if (!buildRes.ok) {
        const data = await buildRes.json();
        setError(data.error || "Erreur construction prompt");
        return;
      }
      const { prompt } = await buildRes.json();

      const genRes = await fetch("/api/playground/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model }),
      });
      if (!genRes.ok) {
        const data = await genRes.json();
        setError(data.error || "Erreur de génération");
        return;
      }
      const data = await genRes.json();
      setGeneratedHtmlV2(data.html);
      setTokenInfoV2({ promptTokens: data.promptTokens, completionTokens: data.completionTokens });
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingHumanize(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Paramètres
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ID Produit (ProductIntelligence)</Label>
              <Input
                placeholder="cmmvx75me0045zw3ocwbks0jo"
                value={intelligenceId}
                onChange={(e) => setIntelligenceId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Média</Label>
              <Select value={mediaId} onValueChange={handleMediaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un média" />
                </SelectTrigger>
                <SelectContent>
                  {medias.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mot-clé principal</Label>
              <Input
                placeholder="robot patissier (optionnel)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre de mots</Label>
              <Input
                type="number"
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Modèle IA</Label>
              <ModelSelect value={model} onChange={setModel} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Section plan (collé manuellement)</Label>
            <Textarea
              placeholder="Collez ici la section du plan éditorial pour ce produit (brief SAVE, mots-clés, etc.)"
              value={planSection}
              onChange={(e) => setPlanSection(e.target.value)}
              rows={6}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleLoadPrompt} disabled={loadingPrompt}>
            {loadingPrompt && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Charger le prompt
          </Button>
        </CardContent>
      </Card>

      {segments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Prompt</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBadges(!showBadges)}
                  className="flex items-center gap-1"
                >
                  {showBadges ? <Type className="w-3 h-3" /> : <Tags className="w-3 h-3" />}
                  {showBadges ? "Texte brut" : "Badges"}
                </Button>
                <Button onClick={handleGenerate} disabled={loadingGenerate}>
                  {loadingGenerate && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Générer
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showBadges ? (
              <AnnotatedPromptDisplay segments={segments} />
            ) : (
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                {fullPrompt}
              </pre>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Pour modifier le template, rendez-vous dans <a href="/parametres" className="underline hover:text-foreground">Paramètres &rarr; Prompts</a>.
            </p>
          </CardContent>
        </Card>
      )}

      {(generatedHtml || loadingGenerate) && (
        <HtmlResultCard
          title="Résultat V1"
          html={generatedHtml}
          loading={loadingGenerate}
          loadingMessage="Génération en cours..."
          tokenInfo={tokenInfo}
          extra={
            generatedHtml && !loadingGenerate ? (
              <Button size="sm" onClick={() => handleHumanize()} disabled={loadingHumanize}>
                {loadingHumanize && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Humaniser
              </Button>
            ) : undefined
          }
        />
      )}

      {(generatedHtmlV2 || loadingHumanize) && (
        <HtmlResultCard
          title="Résultat V2"
          html={generatedHtmlV2}
          loading={loadingHumanize}
          loadingMessage="Humanisation en cours..."
          tokenInfo={tokenInfoV2}
        />
      )}
    </div>
  );
}

// ─── Onglet Plan ────────────────────────────────────────────────────────────

function TabPlan() {
  const [guideId, setGuideId] = useState("");
  const [model, setModel] = useState("gpt-5.4");
  const [mediaName, setMediaName] = useState("");

  const [segments, setSegments] = useState<PromptSegment[]>([]);
  const [fullPrompt, setFullPrompt] = useState("");

  const [generatedHtml, setGeneratedHtml] = useState("");
  const [tokenInfo, setTokenInfo] = useState<{ promptTokens: number; completionTokens: number } | null>(null);

  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [error, setError] = useState("");
  const [showBadges, setShowBadges] = useState(true);

  const handleLoadPrompt = async () => {
    if (!guideId.trim()) {
      setError("L'ID du guide est requis");
      return;
    }
    setError("");
    setLoadingPrompt(true);
    setSegments([]);
    setFullPrompt("");
    setGeneratedHtml("");
    setTokenInfo(null);
    try {
      const res = await fetch("/api/playground/build-plan-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId: guideId.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur");
        return;
      }
      const data = await res.json();
      setSegments(data.segments);
      setFullPrompt(data.fullPrompt);
      setMediaName(data.mediaName || "");
      if (data.modelPlan) setModel(data.modelPlan);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (!fullPrompt.trim()) {
      setError("Charge d'abord le prompt");
      return;
    }
    setError("");
    setLoadingGenerate(true);
    setGeneratedHtml("");
    setTokenInfo(null);
    try {
      const res = await fetch("/api/playground/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, model }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur de génération");
        return;
      }
      const data = await res.json();
      setGeneratedHtml(data.html);
      setTokenInfo({ promptTokens: data.promptTokens, completionTokens: data.completionTokens });
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingGenerate(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Paramètres
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ID Guide</Label>
              <Input
                placeholder="cmmvx5vv30001zw3ojprrmp4g"
                value={guideId}
                onChange={(e) => setGuideId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Modèle IA</Label>
              <ModelSelect value={model} onChange={setModel} />
            </div>
            {mediaName && (
              <div className="space-y-2">
                <Label>Média</Label>
                <p className="text-sm text-muted-foreground pt-2">{mediaName}</p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleLoadPrompt} disabled={loadingPrompt}>
            {loadingPrompt && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Charger le prompt
          </Button>
        </CardContent>
      </Card>

      {segments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Prompt Plan</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBadges(!showBadges)}
                  className="flex items-center gap-1"
                >
                  {showBadges ? <Type className="w-3 h-3" /> : <Tags className="w-3 h-3" />}
                  {showBadges ? "Texte brut" : "Badges"}
                </Button>
                <Button onClick={handleGenerate} disabled={loadingGenerate}>
                  {loadingGenerate && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Générer
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showBadges ? (
              <AnnotatedPromptDisplay segments={segments} />
            ) : (
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                {fullPrompt}
              </pre>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Pour modifier le template, rendez-vous dans <a href="/medias" className="underline hover:text-foreground">Médias &rarr; {mediaName || "votre média"}</a>.
            </p>
          </CardContent>
        </Card>
      )}

      {(generatedHtml || loadingGenerate) && (
        <HtmlResultCard
          title="Plan généré"
          html={generatedHtml}
          loading={loadingGenerate}
          loadingMessage="Génération du plan en cours..."
          tokenInfo={tokenInfo}
        />
      )}
    </div>
  );
}

// ─── Page principale ────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [medias, setMedias] = useState<MediaOption[]>([]);

  useEffect(() => {
    fetch("/api/medias")
      .then((r) => r.json())
      .then((data) => setMedias(data))
      .catch(() => {});
  }, []);

  return (
    <>
      <Header title="Playground" />
      <div className="p-6 space-y-6">
        <Tabs defaultValue="fiche">
          <TabsList>
            <TabsTrigger value="fiche" className="flex items-center gap-1">
              <FlaskConical className="w-3 h-3" /> Fiche produit
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-1">
              <FileText className="w-3 h-3" /> Plan
            </TabsTrigger>
          </TabsList>
          <TabsContent value="fiche" className="mt-6">
            <TabFicheProduit medias={medias} />
          </TabsContent>
          <TabsContent value="plan" className="mt-6">
            <TabPlan />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
