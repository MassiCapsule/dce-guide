"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

type PromptKey = "generation" | "analysis" | "criteres";

const PROMPT_TABS: { key: PromptKey; label: string; hasModel: boolean }[] = [
  { key: "criteres", label: "Criteres Perplexity", hasModel: false },
  { key: "analysis", label: "Analyse", hasModel: true },
  { key: "generation", label: "Generation", hasModel: true },
];

function ModelSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[240px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>OpenAI</SelectLabel>
          {OPENAI_MODELS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Anthropic</SelectLabel>
          {ANTHROPIC_MODELS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default function ParametresPage() {
  const [keys, setKeys] = useState<{ openai: string; anthropic: string; apify: string; serpmantics: string }>({ openai: "", anthropic: "", apify: "", serpmantics: "" });
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [criteresPrompt, setCriteresPrompt] = useState("");
  const [promptTab, setPromptTab] = useState<PromptKey>("criteres");
  const [promptSaved, setPromptSaved] = useState(false);

  // Per-prompt models
  const [modelGeneration, setModelGeneration] = useState("gpt-4o");
  const [modelAnalysis, setModelAnalysis] = useState("gpt-4o");
  // API keys
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicKeySaved, setAnthropicKeySaved] = useState(false);
  const [apifyKey, setApifyKey] = useState("");
  const [serpmanticsKey, setSerpmanticsKey] = useState("");
  const [openaiKeySaved, setOpenaiKeySaved] = useState(false);
  const [apifyKeySaved, setApifyKeySaved] = useState(false);
  const [serpmanticsKeySaved, setSerpmanticsKeySaved] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        // Per-prompt models (fallback to legacy openai_model)
        const fallbackModel = data.openai_model || "gpt-4o";
        setModelGeneration(data.model_generation || fallbackModel);
        setModelAnalysis(data.model_analysis || fallbackModel);
        // model_plan is now configured per-media, not globally
        if (data.prompt_generation) setGenerationPrompt(data.prompt_generation);
        if (data.prompt_analysis) setAnalysisPrompt(data.prompt_analysis);
        if (data.prompt_criteres) setCriteresPrompt(data.prompt_criteres);
        if (data.serpmantics_api_key) setSerpmanticsKey(data.serpmantics_api_key);
      });
    fetch("/api/config/keys").then((r) => r.json()).then(setKeys);
    fetch("/api/config/prompts")
      .then((r) => r.json())
      .then((defaults) => {
        setGenerationPrompt((prev) => prev || defaults.generation);
        setAnalysisPrompt((prev) => prev || defaults.analysis);
        setCriteresPrompt((prev) => prev || defaults.criteres);
      });
  }, []);

  const saveModelForPrompt = async (configKey: string, value: string) => {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: configKey, value }),
    });
  };

  const handleModelChange = (purpose: PromptKey, value: string) => {
    if (purpose === "generation") {
      setModelGeneration(value);
      saveModelForPrompt("model_generation", value);
    } else if (purpose === "analysis") {
      setModelAnalysis(value);
      saveModelForPrompt("model_analysis", value);
    }
  };

  const getCurrentModel = (tab: PromptKey) => {
    if (tab === "generation") return modelGeneration;
    if (tab === "analysis") return modelAnalysis;
    return "";
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
    ]);
    setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 2000);
  }, [generationPrompt, analysisPrompt, criteresPrompt]);

  const saveApiKey = async (configKey: string, value: string, setSaved: (v: boolean) => void) => {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: configKey, value }),
    });
    fetch("/api/config/keys").then((r) => r.json()).then(setKeys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getPromptValue = (tab: PromptKey) => {
    if (tab === "generation") return generationPrompt;
    if (tab === "analysis") return analysisPrompt;
    return criteresPrompt;
  };

  const setPromptValue = (tab: PromptKey, value: string) => {
    if (tab === "generation") setGenerationPrompt(value);
    else if (tab === "analysis") setAnalysisPrompt(value);
    else if (tab === "criteres") setCriteresPrompt(value);
  };

  const currentTabConfig = PROMPT_TABS.find((t) => t.key === promptTab)!;

  return (
    <>
      <Header title="Parametres" />
      <main className="p-6">
        <Tabs defaultValue="prompts">
          <TabsList className="mb-6">
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="keys">Cles API</TabsTrigger>
          </TabsList>

          {/* Onglet Prompts */}
          <TabsContent value="prompts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Prompts IA</CardTitle>
                    <CardDescription>
                      Editez les prompts et choisissez le modele pour chaque etape
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
                  {/* Sub-tabs prompts */}
                  <div className="flex gap-1">
                    {PROMPT_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setPromptTab(tab.key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          promptTab === tab.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Model selector per prompt */}
                  {currentTabConfig.hasModel && (
                    <div className="flex items-center gap-3">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Modele :</Label>
                      <ModelSelector
                        value={getCurrentModel(promptTab)}
                        onChange={(v) => handleModelChange(promptTab, v)}
                      />
                    </div>
                  )}

                  {/* Prompt textarea */}
                  <textarea
                    value={getPromptValue(promptTab)}
                    onChange={(e) => setPromptValue(promptTab, e.target.value)}
                    className="w-full h-[500px] text-xs bg-muted p-4 rounded-lg font-mono leading-relaxed resize-y border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                    spellCheck={false}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Cles API */}
          <TabsContent value="keys">
            <div className="max-w-xl">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cles API</CardTitle>
                  <CardDescription>Sauvegardees en base de donnees. Les cles du fichier .env sont utilisees en fallback.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>OpenAI</Label>
                      {keys.openai && (
                        <code className="text-xs text-muted-foreground font-mono">{keys.openai}</code>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-..."
                        className="flex-1 font-mono text-xs"
                      />
                      <Button size="sm" onClick={() => saveApiKey("openai_api_key", openaiKey, setOpenaiKeySaved)}>
                        {openaiKeySaved ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Anthropic</Label>
                      {keys.anthropic && (
                        <code className="text-xs text-muted-foreground font-mono">{keys.anthropic}</code>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="flex-1 font-mono text-xs"
                      />
                      <Button size="sm" onClick={() => saveApiKey("anthropic_api_key", anthropicKey, setAnthropicKeySaved)}>
                        {anthropicKeySaved ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Apify</Label>
                      {keys.apify && (
                        <code className="text-xs text-muted-foreground font-mono">{keys.apify}</code>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={apifyKey}
                        onChange={(e) => setApifyKey(e.target.value)}
                        placeholder="apify_api_..."
                        className="flex-1 font-mono text-xs"
                      />
                      <Button size="sm" onClick={() => saveApiKey("apify_api_token", apifyKey, setApifyKeySaved)}>
                        {apifyKeySaved ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Serpmantics</Label>
                      {keys.serpmantics && (
                        <code className="text-xs text-muted-foreground font-mono">{keys.serpmantics}</code>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={serpmanticsKey}
                        onChange={(e) => setSerpmanticsKey(e.target.value)}
                        placeholder="Colle ta cle API ici..."
                        className="flex-1 font-mono text-xs"
                      />
                      <Button size="sm" onClick={() => saveApiKey("serpmantics_api_key", serpmanticsKey, setSerpmanticsKeySaved)}>
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
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
