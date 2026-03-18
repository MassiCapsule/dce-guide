"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o", desc: "~2.50$/M input, ~10$/M output" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "~0.15$/M input, ~0.60$/M output" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "~10$/M input, ~30$/M output" },
  { value: "o1", label: "o1", desc: "~15$/M input, ~60$/M output" },
  { value: "o1-mini", label: "o1-mini", desc: "~1.10$/M input, ~4.40$/M output" },
];

interface DailyCost {
  totalCost: number;
  generationCost: number;
  analysisCost: number;
  scrapingCost: number;
  cardCount: number;
}

export default function ParametresPage() {
  const [model, setModel] = useState("gpt-4o");
  const [keys, setKeys] = useState<{ openai: string; apify: string }>({ openai: "", apify: "" });
  const [daily, setDaily] = useState<DailyCost | null>(null);
  const [saving, setSaving] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [criteresPrompt, setCriteresPrompt] = useState("");
  const [planPrompt, setPlanPrompt] = useState("");
  const [promptTab, setPromptTab] = useState<"generation" | "analysis" | "criteres" | "plan">("generation");
  const [promptSaved, setPromptSaved] = useState(false);
  const [serpmanticsKey, setSerpmanticsKey] = useState("");
  const [serpmanticsKeySaved, setSerpmanticsKeySaved] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.openai_model) setModel(data.openai_model);
        if (data.prompt_generation) setGenerationPrompt(data.prompt_generation);
        if (data.prompt_analysis) setAnalysisPrompt(data.prompt_analysis);
        if (data.prompt_criteres) setCriteresPrompt(data.prompt_criteres);
        if (data.prompt_plan) setPlanPrompt(data.prompt_plan);
        if (data.serpmantics_api_key) setSerpmanticsKey(data.serpmantics_api_key);
      });
    fetch("/api/config/keys").then((r) => r.json()).then(setKeys);
    fetch("/api/stats/daily-cost").then((r) => r.json()).then(setDaily);
    // Load defaults if not yet saved in config
    fetch("/api/config/prompts")
      .then((r) => r.json())
      .then((defaults) => {
        setGenerationPrompt((prev) => prev || defaults.generation);
        setAnalysisPrompt((prev) => prev || defaults.analysis);
        setCriteresPrompt((prev) => prev || defaults.criteres);
        setPlanPrompt((prev) => prev || defaults.plan);
      });
  }, []);

  const handleModelChange = async (value: string) => {
    setModel(value);
    setSaving(true);
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "openai_model", value }),
    });
    setSaving(false);
  };

  const savePrompt = useCallback(async () => {
    setPromptSaved(false);
    await Promise.all([
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "prompt_generation", value: generationPrompt }),
      }),
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "prompt_analysis", value: analysisPrompt }),
      }),
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "prompt_criteres", value: criteresPrompt }),
      }),
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "prompt_plan", value: planPrompt }),
      }),
    ]);
    setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 2000);
  }, [generationPrompt, analysisPrompt, criteresPrompt, planPrompt]);

  const saveSerpmanticsKey = async () => {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "serpmantics_api_key", value: serpmanticsKey }),
    });
    setSerpmanticsKeySaved(true);
    setTimeout(() => setSerpmanticsKeySaved(false), 2000);
  };

  return (
    <>
      <Header title="Parametres" />
      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne gauche : Config */}
          <div className="space-y-6">
            {/* API Keys */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cles API</CardTitle>
                <CardDescription>Definies dans le fichier .env</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>OpenAI</Label>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {keys.openai || "Non configuree"}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Apify</Label>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {keys.apify || "Non configuree"}
                  </code>
                </div>
                <div className="space-y-1.5">
                  <Label>Serpmantics</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={serpmanticsKey}
                      onChange={(e) => setSerpmanticsKey(e.target.value)}
                      placeholder="Colle ta clé API ici..."
                      className="flex-1 font-mono text-xs"
                    />
                    <Button size="sm" onClick={saveSerpmanticsKey}>
                      {serpmanticsKeySaved ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Model Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modele OpenAI</CardTitle>
                <CardDescription>
                  Utilise pour la generation et l&apos;analyse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Select value={model} onValueChange={handleModelChange}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <span className="font-medium">{m.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{m.desc}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {saving && <span className="text-xs text-muted-foreground">Enregistrement...</span>}
                </div>
              </CardContent>
            </Card>

            {/* Daily Cost */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Couts API du jour</CardTitle>
              </CardHeader>
              <CardContent>
                {daily ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fiches generees</span>
                      <Badge variant="secondary">{daily.cardCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Scraping Apify</span>
                      <span className="text-sm font-mono">{daily.scrapingCost.toFixed(4)} $</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Analyse OpenAI</span>
                      <span className="text-sm font-mono">{daily.analysisCost.toFixed(4)} $</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Generation OpenAI</span>
                      <span className="text-sm font-mono">{daily.generationCost.toFixed(4)} $</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm font-semibold">Total du jour</span>
                      <span className="text-sm font-mono font-semibold">{daily.totalCost.toFixed(4)} $</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Prompts */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Prompts OpenAI</CardTitle>
                  <CardDescription>
                    Editez les prompts envoyes a OpenAI
                  </CardDescription>
                </div>
                <Button size="sm" onClick={savePrompt}>
                  {promptSaved ? (
                    <Check className="mr-2 h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Save className="mr-2 h-3.5 w-3.5" />
                  )}
                  {promptSaved ? "Enregistre" : "Enregistrer"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => setPromptTab("generation")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      promptTab === "generation"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Generation
                  </button>
                  <button
                    onClick={() => setPromptTab("analysis")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      promptTab === "analysis"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Analyse
                  </button>
                  <button
                    onClick={() => setPromptTab("criteres")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      promptTab === "criteres"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Critères Perplexity
                  </button>
                  <button
                    onClick={() => setPromptTab("plan")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      promptTab === "plan"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Plan
                  </button>
                </div>
                {promptTab === "generation" ? (
                  <textarea
                    value={generationPrompt}
                    onChange={(e) => setGenerationPrompt(e.target.value)}
                    className="w-full h-[500px] text-xs bg-muted p-4 rounded-lg font-mono leading-relaxed resize-y border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                    spellCheck={false}
                  />
                ) : promptTab === "analysis" ? (
                  <textarea
                    value={analysisPrompt}
                    onChange={(e) => setAnalysisPrompt(e.target.value)}
                    className="w-full h-[500px] text-xs bg-muted p-4 rounded-lg font-mono leading-relaxed resize-y border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                    spellCheck={false}
                  />
                ) : promptTab === "criteres" ? (
                  <textarea
                    value={criteresPrompt}
                    onChange={(e) => setCriteresPrompt(e.target.value)}
                    className="w-full h-[500px] text-xs bg-muted p-4 rounded-lg font-mono leading-relaxed resize-y border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                    spellCheck={false}
                  />
                ) : (
                  <textarea
                    value={planPrompt}
                    onChange={(e) => setPlanPrompt(e.target.value)}
                    className="w-full h-[500px] text-xs bg-muted p-4 rounded-lg font-mono leading-relaxed resize-y border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                    spellCheck={false}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
