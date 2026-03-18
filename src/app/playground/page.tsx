"use client";

import { useState, useEffect } from "react";
import { Loader2, Eye, Code, FlaskConical } from "lucide-react";
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

export default function PlaygroundPage() {
  // Inputs
  const [intelligenceId, setIntelligenceId] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [wordCount, setWordCount] = useState<number>(800);
  const [planSection, setPlanSection] = useState("");
  const [model, setModel] = useState("gpt-5.4");

  // Data
  const [medias, setMedias] = useState<MediaOption[]>([]);
  const [segments, setSegments] = useState<PromptSegment[]>([]);
  const [fullPrompt, setFullPrompt] = useState("");
  const [editablePrompt, setEditablePrompt] = useState("");
  const [editMode, setEditMode] = useState(false);

  // Generation
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [tokenInfo, setTokenInfo] = useState<{ promptTokens: number; completionTokens: number } | null>(null);

  // Loading states
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [error, setError] = useState("");

  // Load medias on mount
  useEffect(() => {
    fetch("/api/medias")
      .then((r) => r.json())
      .then((data) => {
        setMedias(data);
        if (data.length > 0) {
          setMediaId(data[0].id);
          setWordCount(data[0].defaultProductWordCount || 800);
        }
      })
      .catch(() => {});
  }, []);

  // Update word count when media changes
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
      setEditablePrompt(data.fullPrompt);
      setEditMode(false);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    const promptToSend = editMode ? editablePrompt : fullPrompt;
    if (!promptToSend.trim()) {
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
        body: JSON.stringify({ prompt: promptToSend, model }),
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
    <>
      <Header title="Playground — Prompt Fiche Produit" />
      <div className="p-6 space-y-6">
        {/* Zone d'entrées */}
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
                <Select value={model} onValueChange={setModel}>
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

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button onClick={handleLoadPrompt} disabled={loadingPrompt}>
              {loadingPrompt && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Charger le prompt
            </Button>
          </CardContent>
        </Card>

        {/* Zone prompt annotée */}
        {(segments.length > 0 || editMode) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Prompt</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant={editMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (!editMode) setEditablePrompt(fullPrompt);
                      setEditMode(!editMode);
                    }}
                  >
                    {editMode ? "Vue badges" : "Mode édition"}
                  </Button>
                  <Button onClick={handleGenerate} disabled={loadingGenerate}>
                    {loadingGenerate && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Générer
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <Textarea
                  value={editablePrompt}
                  onChange={(e) => setEditablePrompt(e.target.value)}
                  rows={30}
                  className="font-mono text-sm"
                />
              ) : (
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
              )}
            </CardContent>
          </Card>
        )}

        {/* Zone résultat */}
        {(generatedHtml || loadingGenerate) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Résultat</CardTitle>
                {tokenInfo && (
                  <p className="text-xs text-muted-foreground">
                    Tokens : {tokenInfo.promptTokens} prompt + {tokenInfo.completionTokens} completion
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingGenerate ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Génération en cours...</span>
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
                      dangerouslySetInnerHTML={{ __html: generatedHtml }}
                    />
                  </TabsContent>
                  <TabsContent value="source">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                      {generatedHtml}
                    </pre>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
