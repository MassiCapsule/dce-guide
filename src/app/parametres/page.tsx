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
import ReactMarkdown from "react-markdown";

const MODELS = [
  { value: "gpt-5.4", label: "GPT-5.4", provider: "OpenAI" },
  { value: "gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "Anthropic" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4", provider: "Anthropic" },
  { value: "claude-haiku-4-20250414", label: "Claude Haiku 4", provider: "Anthropic" },
];

const OPENAI_MODELS = MODELS.filter((m) => m.provider === "OpenAI");
const ANTHROPIC_MODELS = MODELS.filter((m) => m.provider === "Anthropic");

type PromptKey = "generation" | "analysis" | "criteres" | "criteres_auto" | "humaniser" | "resume" | "chapo" | "sommaire" | "criteres_selection" | "faq" | "meta" | "forbidden_words" | "postprod";

const PROMPT_TABS: { key: PromptKey; label: string }[] = [
  { key: "criteres", label: "Criteres Perplexity" },
  { key: "criteres_auto", label: "Criteres auto (IA)" },
  { key: "analysis", label: "Analyse" },
  { key: "generation", label: "Generation" },
  { key: "resume", label: "Resume" },
  { key: "chapo", label: "Chapo + Intro" },
  { key: "sommaire", label: "Sommaire" },
  { key: "criteres_selection", label: "Criteres selection" },
  { key: "faq", label: "FAQ" },
  { key: "meta", label: "Meta + Slug" },
  { key: "humaniser", label: "Humaniser" },
  { key: "forbidden_words", label: "Interdits lexicaux" },
  { key: "postprod", label: "Post-traitement" },
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
  const [humaniserPrompt, setHumaniserPrompt] = useState("");
  const [resumePrompt, setResumePrompt] = useState("");
  const [chapoPrompt, setChapoPrompt] = useState("");
  const [sommairePrompt, setSommairePrompt] = useState("");
  const [criteresSelectionPrompt, setCriteresSelectionPrompt] = useState("");
  const [faqPrompt, setFaqPrompt] = useState("");
  const [metaPrompt, setMetaPrompt] = useState("");
  const [forbiddenWordsText, setForbiddenWordsText] = useState("");
  const [criteresAutoPrompt, setCriteresAutoPrompt] = useState("");
  const [promptTab, setPromptTab] = useState<PromptKey>("criteres");
  const [promptSaved, setPromptSaved] = useState(false);
  const [readmeContent, setReadmeContent] = useState<string>("");

  // Global models (2 only)
  const [modelGeneration, setModelGeneration] = useState("gpt-4o");
  const [modelHumanization, setModelHumanization] = useState("gpt-4o");
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
        const fallbackModel = data.openai_model || "gpt-4o";
        setModelGeneration(data.model_generation || fallbackModel);
        setModelHumanization(data.model_humanization || data.model_generation || fallbackModel);
        if (data.prompt_generation) setGenerationPrompt(data.prompt_generation);
        if (data.prompt_analysis) setAnalysisPrompt(data.prompt_analysis);
        if (data.prompt_criteres) setCriteresPrompt(data.prompt_criteres);
        if (data.prompt_criteres_auto) setCriteresAutoPrompt(data.prompt_criteres_auto);
        if (data.prompt_humaniser) setHumaniserPrompt(data.prompt_humaniser);
        if (data.prompt_resume) setResumePrompt(data.prompt_resume);
        if (data.prompt_chapo) setChapoPrompt(data.prompt_chapo);
        if (data.prompt_sommaire) setSommairePrompt(data.prompt_sommaire);
        if (data.prompt_criteres_selection) setCriteresSelectionPrompt(data.prompt_criteres_selection);
        if (data.prompt_faq) setFaqPrompt(data.prompt_faq);
        if (data.prompt_meta) setMetaPrompt(data.prompt_meta);
        if (data.forbidden_words) {
          try {
            const words = JSON.parse(data.forbidden_words);
            setForbiddenWordsText(Array.isArray(words) ? words.join("\n") : "");
          } catch {
            setForbiddenWordsText("");
          }
        }
        if (data.serpmantics_api_key) setSerpmanticsKey(data.serpmantics_api_key);
      });
    fetch("/api/config/keys").then((r) => r.json()).then(setKeys);
    fetch("/api/readme").then((r) => r.json()).then((data) => setReadmeContent(data.content));
    fetch("/api/config/prompts")
      .then((r) => r.json())
      .then((defaults) => {
        setGenerationPrompt((prev) => prev || defaults.generation);
        setAnalysisPrompt((prev) => prev || defaults.analysis);
        setCriteresPrompt((prev) => prev || defaults.criteres);
        setCriteresAutoPrompt((prev) => prev || defaults.criteres_auto);
        setHumaniserPrompt((prev) => prev || defaults.humaniser);
        setResumePrompt((prev) => prev || defaults.resume);
        setChapoPrompt((prev) => prev || defaults.chapo);
        setSommairePrompt((prev) => prev || defaults.sommaire);
        setCriteresSelectionPrompt((prev) => prev || defaults.criteres_selection);
        setFaqPrompt((prev) => prev || defaults.faq);
        setMetaPrompt((prev) => prev || defaults.meta);
      });
  }, []);

  const saveModelForPrompt = async (configKey: string, value: string) => {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: configKey, value }),
    });
  };

  const handleModelGenerationChange = (value: string) => {
    setModelGeneration(value);
    saveModelForPrompt("model_generation", value);
  };

  const handleModelHumanizationChange = (value: string) => {
    setModelHumanization(value);
    saveModelForPrompt("model_humanization", value);
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
        body: JSON.stringify({ key: "prompt_criteres_auto", value: criteresAutoPrompt }),
      }),
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "prompt_humaniser", value: humaniserPrompt }),
      }),
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "prompt_resume", value: resumePrompt }),
      }),
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "prompt_chapo", value: chapoPrompt }),
      }),
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "prompt_sommaire", value: sommairePrompt }),
      }),
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "prompt_criteres_selection", value: criteresSelectionPrompt }),
      }),
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "prompt_faq", value: faqPrompt }),
      }),
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "prompt_meta", value: metaPrompt }),
      }),
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "forbidden_words",
          value: JSON.stringify(
            forbiddenWordsText.split("\n").map((w: string) => w.trim()).filter((w: string) => w.length > 0)
          ),
        }),
      }),
    ]);
    setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 2000);
  }, [generationPrompt, analysisPrompt, criteresPrompt, criteresAutoPrompt, humaniserPrompt, resumePrompt, chapoPrompt, sommairePrompt, criteresSelectionPrompt, faqPrompt, metaPrompt, forbiddenWordsText]);

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
    if (tab === "humaniser") return humaniserPrompt;
    if (tab === "resume") return resumePrompt;
    if (tab === "chapo") return chapoPrompt;
    if (tab === "sommaire") return sommairePrompt;
    if (tab === "criteres_selection") return criteresSelectionPrompt;
    if (tab === "faq") return faqPrompt;
    if (tab === "meta") return metaPrompt;
    if (tab === "criteres_auto") return criteresAutoPrompt;
    if (tab === "forbidden_words") return forbiddenWordsText;
    return criteresPrompt;
  };

  const setPromptValue = (tab: PromptKey, value: string) => {
    if (tab === "generation") setGenerationPrompt(value);
    else if (tab === "analysis") setAnalysisPrompt(value);
    else if (tab === "criteres") setCriteresPrompt(value);
    else if (tab === "criteres_auto") setCriteresAutoPrompt(value);
    else if (tab === "humaniser") setHumaniserPrompt(value);
    else if (tab === "resume") setResumePrompt(value);
    else if (tab === "chapo") setChapoPrompt(value);
    else if (tab === "sommaire") setSommairePrompt(value);
    else if (tab === "criteres_selection") setCriteresSelectionPrompt(value);
    else if (tab === "faq") setFaqPrompt(value);
    else if (tab === "meta") setMetaPrompt(value);
    else if (tab === "forbidden_words") setForbiddenWordsText(value);
  };


  return (
    <>
      <Header title="Parametres" />
      <main className="p-6">
        <Tabs defaultValue="prompts">
          <TabsList className="mb-6">
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="keys">Cles API</TabsTrigger>
            <TabsTrigger value="doc">Doc</TabsTrigger>
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

                  {/* Prompt textarea, forbidden words, or post-processing info */}
                  {promptTab === "postprod" ? (
                    <div className="space-y-4 text-sm p-4 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground">
                        Ces traitements sont appliques automatiquement apres chaque generation (V1, V2, relance Intro+FAQ). Ils ne sont pas editables.
                      </p>

                      <div className="space-y-3">
                        <div className="border-l-2 border-primary pl-3">
                          <p className="font-medium">1. Suppression du gras dans le corps</p>
                          <p className="text-muted-foreground text-xs">Les balises &lt;strong&gt; sont retirees partout sauf dans les titres (H1-H6) et le chapo.</p>
                        </div>

                        <div className="border-l-2 border-primary pl-3">
                          <p className="font-medium">2. Suppression des italiques</p>
                          <p className="text-muted-foreground text-xs">Toutes les balises &lt;em&gt; sont retirees du contenu.</p>
                        </div>

                        <div className="border-l-2 border-primary pl-3">
                          <p className="font-medium">3. Majuscule en debut de phrase</p>
                          <p className="text-muted-foreground text-xs">Apres un point, un point d&apos;exclamation ou un point d&apos;interrogation, la lettre suivante est forcee en majuscule.</p>
                        </div>

                        <div className="border-l-2 border-primary pl-3">
                          <p className="font-medium">4. Minuscule apres les deux-points</p>
                          <p className="text-muted-foreground text-xs">Apres le signe &quot;:&quot;, la lettre suivante est forcee en minuscule. Corriger manuellement si nom propre.</p>
                        </div>

                        <div className="border-l-2 border-primary pl-3">
                          <p className="font-medium">5. Majuscule en debut de titre</p>
                          <p className="text-muted-foreground text-xs">Le premier caractere de chaque H1, H2 et H3 est force en majuscule.</p>
                        </div>

                        <div className="border-l-2 border-primary pl-3">
                          <p className="font-medium">6. Gras force sur le chapo</p>
                          <p className="text-muted-foreground text-xs">Le contenu du &lt;p class=&quot;chapo&quot;&gt; est automatiquement enveloppe dans &lt;strong&gt;.</p>
                        </div>

                        <div className="border-l-2 border-primary pl-3">
                          <p className="font-medium">7. Liens Amazon avec tag affilie</p>
                          <p className="text-muted-foreground text-xs">Les URLs Amazon sont transformees en : amazon.fr/dp/ASIN?tag=dce-motcle-DDMMYY-21</p>
                        </div>

                        <div className="border-l-2 border-primary pl-3">
                          <p className="font-medium">8. Bouton &quot;VOIR SUR AMAZON&quot;</p>
                          <p className="text-muted-foreground text-xs">Un &lt;p&gt;&lt;strong&gt;VOIR SUR AMAZON&lt;/strong&gt;&lt;/p&gt; est ajoute apres chaque ligne URL + prix.</p>
                        </div>

                        <div className="border-l-2 border-primary pl-3">
                          <p className="font-medium">9. Image produit apres le H2</p>
                          <p className="text-muted-foreground text-xs">L&apos;image Amazon du produit est inseree automatiquement apres le titre H2 de chaque fiche.</p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="font-medium text-xs mb-1">Temperatures IA</p>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          <span>Chapo + Introduction</span><span className="font-mono">0.9</span>
                          <span>Meta + H1 (slug, titre, legende)</span><span className="font-mono">0.9</span>
                          <span>Sommaire, Criteres, FAQ</span><span className="font-mono">0.7</span>
                          <span>Fiches produits, Resume</span><span className="font-mono">0.7</span>
                          <span>Humanisation (V2)</span><span className="font-mono">0.7</span>
                        </div>
                      </div>
                    </div>
                  ) : promptTab === "forbidden_words" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Mots et expressions a ne jamais utiliser dans les contenus generes (un par ligne). Variable : <code className="bg-muted-foreground/10 px-1 rounded">{"{forbiddenWords}"}</code>
                      </p>
                      <textarea
                        value={forbiddenWordsText}
                        onChange={(e) => setForbiddenWordsText(e.target.value)}
                        className="w-full h-[500px] text-sm bg-muted p-4 rounded-lg leading-relaxed resize-y border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Un mot ou expression par ligne"
                        spellCheck={false}
                      />
                    </div>
                  ) : (
                    <textarea
                      value={getPromptValue(promptTab)}
                      onChange={(e) => setPromptValue(promptTab, e.target.value)}
                      className="w-full h-[500px] text-xs bg-muted p-4 rounded-lg font-mono leading-relaxed resize-y border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                      spellCheck={false}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Cles API */}
          <TabsContent value="keys">
            <div className="max-w-xl space-y-6">
              {/* Modèles IA */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Modeles IA</CardTitle>
                  <CardDescription>Modele utilise pour chaque etape du pipeline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Modele Article (V1)</Label>
                    <p className="text-xs text-muted-foreground">Utilise pour l&apos;analyse, le plan, les fiches et les enrichissements.</p>
                    <ModelSelector value={modelGeneration} onChange={handleModelGenerationChange} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Modele Humanisation (V2)</Label>
                    <p className="text-xs text-muted-foreground">Utilise uniquement pour la reecriture de l&apos;article V1 en V2.</p>
                    <ModelSelector value={modelHumanization} onChange={handleModelHumanizationChange} />
                  </div>
                </CardContent>
              </Card>

              {/* Clés API */}
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

          {/* Onglet Documentation */}
          <TabsContent value="doc">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documentation</CardTitle>
                <CardDescription>Guide d&apos;utilisation de l&apos;outil</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{readmeContent}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
