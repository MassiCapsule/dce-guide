# CLAUDE.md — Mémoire du projet fiche-produit-generator

## Liens utiles
- **README** : [README.md](README.md) — Documentation utilisateur (à mettre à jour en même temps que CLAUDE.md)
- **TODO** : [docs/todo.md](docs/todo.md) — Liste des tâches à faire
- **Idées** : [docs/idees.md](docs/idees.md) — Idées futures

## Démarrer le projet

**PowerShell (Windows) :**
```powershell
cd C:\ClaudeCode\fiche-produit-generator
npm run dev
```

**Git Bash :**
```bash
cd /c/ClaudeCode/fiche-produit-generator
npm run dev
```

→ `http://localhost:3000`

## Ce que fait ce projet
Générateur de guides d'achat SEO avec fiches produits Amazon.
- Scrape les produits Amazon via **Apify**
- Analyse les avis avec **OpenAI** ou **Anthropic** (modèle configurable par étape)
- Génère des fiches HTML optimisées SEO
- Intègre **Serpmantics** pour les mots-clés sémantiques

---

## Stack technique
- **Next.js 14** App Router + TypeScript
- **SQLite** via Prisma ORM (`dev.db`)
- **Tailwind CSS** + shadcn/ui (Radix) + **@tailwindcss/typography**
- **TipTap v3** (éditeur WYSIWYG — installé le 2026-03-13)
- **OpenAI** (génération + analyse — configurable par étape)
- **Anthropic** (alternative à OpenAI — configurable par étape)
- **Apify** (scraping Amazon)
- **Serpmantics** (guide sémantique + mots-clés)

---

## Architecture des fichiers clés

### Frontend
| Fichier | Rôle |
|---------|------|
| `src/components/guides/guide-form.tsx` | Formulaire création guides (keyword + media uniquement) — sans critères, sans ASINs |
| `src/app/parametres/page.tsx` | Page config : 3 onglets (Prompts, Clés API, Doc). 13 sous-onglets prompts (dont Critères auto IA, Critères sélection, Interdits lexicaux, Post-traitement en lecture seule). Doc affiche le README |
| `src/app/playground/page.tsx` | Playground : sélecteur guide → produit → prompt résolu complet → génération → humanisation V2 |
| `src/components/editor/rich-editor.tsx` | Éditeur WYSIWYG TipTap v3 (H1/H2/H3, gras, listes, tableau, bouton copier formaté) |
| `src/components/editor/seo-score-bar.tsx` | Barre score SEO Serpmantics + pills mots-clés |
| `src/components/editor/meta-fields.tsx` | Champs méta : slug, meta title, meta desc, légende image (sans H1 — H1 est dans un collapsible séparé) |
| `src/components/guides/tabs/tab-overview.tsx` | Onglet Vue d'ensemble : infos guide, mots-clés collapsible, bouton "Ajouter des produits", progression |
| `src/components/guides/tabs/tab-products.tsx` | Onglet Produits : ajout ASIN, bouton sticky "Lancer la récupération" + barre de progression (scraping/analyse), suppression avec confirmation |
| `src/components/intelligence/intelligence-list.tsx` | Liste produits intelligence avec suppression + confirmation |
| `src/components/guides/tabs/tab-plan.tsx` | Onglet Plan : critères éditables + bouton "Générer (IA)" (auto-génération critères) + bouton Perplexity + bouton sticky "Générer le plan (IA)" + barre de progression + polling + RichEditor |
| `src/components/guides/tabs/tab-article-v2.tsx` | Onglet Article : bouton "Générer l'article" (enchaîne V1→V2 automatiquement) + bouton "Humaniser" (ré-humanise V1 existant) + bouton "Intro + FAQ" + collapsible "Titre H1" + collapsible "Éléments SEO" + collapsible "Article V1 (original)" + RichEditor |
| `src/app/guides/[id]/page.tsx` | Page guide : charge vraies données API, passe guideId + onRefresh à chaque tab, suppression guide avec confirmation |

### API Routes
| Route | Méthode | Rôle |
|-------|---------|------|
| `/api/guides` | POST | Créer un guide (keyword, media, criteria, keywords, wordCount, serpanticsGuideId) |
| `/api/guides/[id]` | GET | Charger un guide complet (products.intelligence + keywords) |
| `/api/guides/[id]` | PATCH | Sauvegarder `criteria`, `planHtml`, `planJson`, MetaFields, `guideHtml`, `guideHtmlV2` |
| `/api/guides/[id]` | DELETE | Supprimer un guide |
| `/api/guides/[id]/products` | POST | Ajouter des ASINs au guide (crée placeholders + GuideProducts) |
| `/api/guides/[id]/products` | DELETE | Supprimer un produit du guide (avec confirmation UI) |
| `/api/intelligence/[id]` | DELETE | Supprimer un ProductIntelligence + fiches générées + liaisons guides |
| `/api/guides/[id]/scrape` | POST | Lancer scraping + analyse en arrière-plan |
| `/api/guides/[id]/scrape` | GET | Polling statut scraping |
| `/api/guides/[id]/plan` | POST | Lancer génération du plan en arrière-plan |
| `/api/guides/[id]/article` | POST | Lancer génération de l'article V1 en arrière-plan |
| `/api/guides/[id]/humanize` | POST | Lancer humanisation de l'article (V1 → V2) en arrière-plan |
| `/api/guides/[id]/regenerate-intro-faq` | POST | Relancer chapô+intro et FAQ — body `{ target: "v1" }` ou `{ target: "v2" }`. V1 ré-assemble l'article complet, V2 remplace les sections dans guideHtmlV2 |
| `/api/guides/[id]/criteres-auto` | POST | Générer les critères d'achat via IA (prompt `prompt_criteres_auto`) et sauvegarder sur le guide |
| `/api/guides/[id]/score` | POST | Calculer le score SEO Serpmantics sur un contenu HTML |
| `/api/guides/[id]/status` | GET | Statut du pipeline (status, currentStep, errorMessage) |
| `/api/guides/[id]/generate` | POST | (legacy) Pipeline complet monolithique |
| `/api/medias` | GET/POST | CRUD medias éditoriaux |
| `/api/config` | GET/POST | Lire/écrire AppConfig (DB) |
| `/api/config/keys` | GET | Afficher les clés API masquées |
| `/api/config/prompts` | GET | Prompts par défaut (valeurs de pré-remplissage, pas utilisées en production) |
| `/api/readme` | GET | Contenu du README.md pour l'onglet Doc |
| `/api/serpmantics/guide` | POST | Créer guide Serpmantics (avec `group: DCE-{NomMedia}-API`) + polling + extraction mots-clés triés par importance + wordCount + serpanticsGuideId |
| `/api/playground/resolve-prompt` | POST | Résout le prompt de génération avec les vraies données d'un guide + produit (plan section extraite automatiquement) |
| `/api/playground/build-prompt` | POST | (legacy) Construit le prompt annoté avec badges variables |
| `/api/playground/generate` | POST | Envoie un prompt au modèle IA choisi, retourne le HTML généré |
| `/api/playground/build-humanize-prompt` | POST | Construit le prompt d'humanisation (résout placeholders média + injecte HTML V1) |

### Lib / Services
| Fichier | Rôle |
|---------|------|
| `src/lib/ai-client.ts` | Client IA unifié — `chatCompletion()` et `chatCompletionStream()` routent vers OpenAI ou Anthropic selon le modèle |
| `src/lib/openai.ts` | Client OpenAI — `getOpenAIClient()` (clé DB puis .env) |
| `src/lib/anthropic.ts` | Client Anthropic — `getAnthropicClient()` (clé DB puis .env) |
| `src/lib/apify.ts` | Client Apify — `getApifyClient()` (clé DB puis .env) |
| `src/lib/prisma.ts` | Client Prisma singleton |
| `src/lib/keywords/distributor.ts` | Distribution mots-clés entre produits |
| `src/lib/guide/pipeline.ts` | (legacy) Pipeline complet monolithique |
| `src/lib/guide/scrape-step.ts` | Scraping Apify + analyse IA (modèle `model_generation`) + tri par prix croissant — status: scraping → analyzing → products-ready |
| `src/lib/guide/plan-types.ts` | Types TypeScript pour le plan JSON structuré (`PlanSection`, `PlanSectionItem`, `PlanProduct`) + helper `parsePlanJson()` |
| `src/lib/guide/plan-generator.ts` | Génération du plan IA (modèle `model_generation`) — double sortie HTML + JSON — status: generating-plan → plan-ready |
| `src/lib/guide/article-generator.ts` | Génération fiches (template DB `prompt_generation`, nb mots depuis `planJson.mots_total`) + résumé + enrichissements + assemblage + post-traitement bold — status: generating → summarizing → enriching → complete |
| `src/lib/guide/enrichment-step.ts` | Enrichissement article : résumé, chapô+intro (temp 0.9), sommaire, critères sélection, FAQ, méta+H1 alternatives — 5 appels parallèles. Helpers `loadForbiddenWords()` + `formatForbiddenWords()` + `stripBoldFromBody()` + `fixCapitalization()`. `regenerateChapoAndFaq()` pour relancer intro+FAQ seuls. `parseMetaResponse()` extrait aussi `h1Alternatives`. Placeholder `{h1}` injecté dans le prompt méta. Extraction sections depuis JSON : `extractSectionFromJson()` (chapô brief, intro brief, critères items, FAQ mots-clés uniquement) + `extractProductListFromJson()` (liste produits pour sommaire) |
| `src/lib/guide/humanize-step.ts` | Humanisation article V1 → V2 via prompt `prompt_humaniser` (modèle `model_humanization`) + post-traitement bold — status: humanizing → complete |
| `src/lib/prompt-builder/index.ts` | (legacy) Ancien prompt builder hardcodé — **plus utilisé par le pipeline**, remplacé par le template DB `prompt_generation` |
| `src/lib/prompt-builder/annotated.ts` | Construit un prompt annoté depuis un template (placeholders → segments avec badges) pour le Playground |
| `src/lib/intelligence/review-analyzer.ts` | Analyse IA des avis — charge le prompt depuis AppConfig (`prompt_analysis`, DB uniquement, erreur si manquant), placeholders : `{title}`, `{brand}`, `{price}`, `{rating}`, `{reviewCount}`, `{description}`, `{features}`, `{count}`, `{reviews}` |

---

## Base de données (Prisma / SQLite)

### Modèles principaux
- **AppConfig** : clé-valeur pour la config runtime (modèles IA par étape, prompts, clés API)
- **Media** : profils éditoriaux avec ton, style, règles, template
- **Guide** : guide d'achat avec statut, HTML généré, coûts, wordCountMin/Max, planHtml, guideHtml, guideHtmlV2, seoScore, seoKeywords
- **GuideProduct** : produits d'un guide avec allocation mots-clés
- **GuideKeyword** : mots-clés SEO d'un guide (min/max occurrences)
- **ProductIntelligence** : données scrappées + analyse IA par ASIN (inclut `shortTitle` — titre court généré par l'IA)
- **GeneratedProductCard** : fiche HTML générée par produit

### Champs Guide importants
| Champ | Rôle |
|-------|------|
| `status` | draft → scraping → analyzing → products-ready → generating-plan → plan-ready → distributing → generating → summarizing → enriching → humanizing → complete (ou error) |
| `criteria` | Critères de sélection des produits (éditable dans Tab Plan) |
| `wordCountMin/Max` | Nb mots cible min/max (récupéré depuis Serpmantics) |
| `serpanticsGuideId` | ID du guide Serpmantics (sauvegardé à la création, utilisé pour le score SEO) |
| `seoScore` | Score SEO Serpmantics (Float?, persisté en DB après chaque calcul) |
| `seoKeywords` | Mots-clés SEO avec occurrences (JSON string, persisté en DB) |
| `planHtml` | Plan d'article généré par IA (HTML pour l'éditeur TipTap) |
| `planJson` | Plan d'article en JSON structuré (pour l'extraction fiable des sections) |
| `guideHtml` | Article complet assemblé par IA (chapô + sommaire + critères + fiches + FAQ) |
| `guideHtmlV2` | Article humanisé par IA (V2) |
| `articleSummary` | Résumé de l'article (~200 mots, utilisé pour générer les éléments complémentaires) |
| `chapoHtml` | Chapô (30 mots) + Introduction (100 mots) |
| `sommaireHtml` | Sommaire / sélection produits |
| `criteresHtml` | Section critères de sélection (entre sommaire et fiches produits) |
| `faqHtml` | FAQ 5 questions |
| `metaTitle` | Meta title généré par IA (éditable dans Éléments SEO) |
| `metaDescription` | Meta description générée par IA (éditable dans Éléments SEO) |
| `imageCaption` | Légende photo générée par IA (éditable dans Éléments SEO) |
| `slug` | Slug URL généré par IA (éditable dans Éléments SEO) |
| `h1Alternatives` | 10 propositions de H1 générées par l'IA (JSON string array, éditable dans collapsible "Titre H1") |

### Champs Media importants
| Champ | Rôle |
|-------|------|
| `description` | Description courte du média (affichée dans le formulaire) |
| `promptPlan` | Prompt de plan spécifique à ce média. **Obligatoire** — erreur si vide. |

### Clés AppConfig importantes
| Clé | Contenu |
|-----|---------|
| `model_generation` | Modèle IA pour tout le pipeline V1 : analyse, plan, fiches, enrichissements (ex: `gpt-5.4`, `claude-sonnet-4-20250514`) |
| `model_humanization` | Modèle IA pour l'humanisation V2 uniquement (fallback sur `model_generation` si non configuré) |
| `prompt_generation` | Prompt template pour générer les fiches produits — **utilisé par le pipeline ET le Playground** — placeholders : `{media.name}`, `{media.toneDescription}`, `{media.writingStyle}`, `{doRules}`, `{dontRules}`, `{forbiddenWords}`, `{intelligence.productTitle}`, `{intelligence.shortTitle}`, `{intelligence.productBrand}`, `{intelligence.productPrice}`, `{intelligence.asin}`, `{intelligence.positioningSummary}`, `{intelligence.keyFeatures}`, `{intelligence.detectedUsages}`, `{intelligence.buyerProfiles}`, `{intelligence.strengthPoints}`, `{intelligence.weaknessPoints}`, `{intelligence.recurringProblems}`, `{intelligence.remarkableQuotes}`, `{keyword}`, `{keywords}`, `{wordCount}`, `{planSection}` |
| `prompt_analysis` | Prompt template pour analyser les avis — placeholders : `{title}`, `{brand}`, `{price}`, `{rating}`, `{reviewCount}`, `{description}`, `{features}`, `{count}`, `{reviews}`. Sections `**System**` et `**User**` détectées automatiquement |
| `prompt_criteres` | Prompt Perplexity pour générer les critères (placeholder `#MotClesprincipal`) |
| `prompt_criteres_auto` | Prompt IA pour auto-générer les 5 critères d'achat — placeholder `{keyword}` — retourne JSON `[{ critere, explication }]` |
| `prompt_humaniser` | Prompt template pour humaniser les fiches produits — placeholders : `{media.toneDescription}`, `{media.writingStyle}`, `{{fiche_produit_v1}}` |
| `prompt_resume` | Prompt pour résumer l'article — placeholder : `{article}` |
| `prompt_chapo` | Prompt chapô (30 mots) + introduction (100 mots) — placeholders : `{media.name}`, `{media.toneDescription}`, `{media.writingStyle}`, `{forbiddenWords}`, `{keyword}`, `{resume}`, `{planSection}` (= brief + mots-clés du chapô et de l'introduction depuis le plan JSON) |
| `prompt_sommaire` | Prompt sommaire / sélection produits — mêmes placeholders + `{planSection}` (= liste des produits avec nom, prix, URL depuis le plan JSON) |
| `prompt_criteres_selection` | Prompt critères de sélection — mêmes placeholders + `{planSection}` (= brief + items numérotés des critères depuis le plan JSON) |
| `prompt_faq` | Prompt FAQ — mêmes placeholders + `{planSection}` (= brief + mots-clés uniquement depuis le plan JSON, plus de questions imposées) |
| `prompt_meta` | Prompt meta title + meta description + légende + slug + 10 propositions H1 — mêmes placeholders (sans `{planSection}`) + `{h1}` (H1 actuel injecté depuis planJson) |
| `forbidden_words` | Interdits lexicaux (JSON string array) — mots/expressions à ne jamais utiliser. Placeholder `{forbiddenWords}` dans les prompts |
| `openai_api_key` | Clé API OpenAI (saisie depuis /parametres > Clés API) |
| `anthropic_api_key` | Clé API Anthropic (saisie depuis /parametres > Clés API) |
| `apify_api_token` | Clé API Apify (saisie depuis /parametres > Clés API) |
| `serpmantics_api_key` | Clé API Serpmantics (saisie depuis /parametres > Clés API) |

---

## Variables d'environnement (.env)
```
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."          ← fallback si pas configurée en DB
ANTHROPIC_API_KEY="sk-ant-..."   ← fallback si pas configurée en DB
APIFY_API_TOKEN="apify_api_..."  ← fallback si pas configurée en DB
SERPMANTICS_API_KEY=""            ← fallback si pas configurée en DB
```

> Toutes les clés API sont prioritairement lues depuis AppConfig (DB), sinon depuis .env.

---

## Workflow séquentiel — 6 étapes

La création d'un guide se fait en 6 étapes enchaînées naturellement :

### Étape 1 — Créer le guide (`/guides/nouveau`)
- Saisir keyword + media uniquement (pas de critères à cette étape)
- Au submit → Serpmantics (polling toutes les 5s, pas d'attente initiale, timeout 10min) → récupère mots-clés + wordCount
- Si échec Serpmantics → bouton "Réessayer Serpmantics" apparaît
- Guide créé en DB → redirige vers `/guides/[id]`

### Étape 2 — Ajouter les produits (Tab Produits)
- Saisir ASINs dans un **Textarea** (un par ligne, ou séparés par espace/virgule) → `POST /api/guides/[id]/products`
- Crée des ProductIntelligence placeholders + GuideProducts
- Bouton "Lancer la récupération" → `POST /api/guides/[id]/scrape` → polling toutes les 3s
- Scraping Apify + analyse IA (modèle `model_analysis`) → status `products-ready`

### Étape 3 — Générer le plan (Tab Plan)
- Critères de sélection : textarea éditable + bouton **"Générer (IA)"** (`POST /api/guides/[id]/criteres-auto`) + bouton "Perplexity"
- Sauvegarder les critères via `PATCH /api/guides/[id]`
- Bouton "Générer le plan (IA)" → `POST /api/guides/[id]/plan` → polling toutes les 3s
- IA génère le plan (modèle `model_generation`) avec les résumés produits + mots-clés + critères
- **Prompt plan obligatoire sur le média** (`media.promptPlan`) — erreur si vide, plus de fallback hardcodé
- Résultat dans `guide.planHtml` → affiché dans RichEditor (éditable)

### Étape 4 — Générer l'article (Tab Article)
- **Un seul onglet "Article"** (l'ancien onglet V1 a été supprimé, l'ancien V2 renommé en "Article")
- Bouton **"Générer l'article"** → enchaîne automatiquement V1 puis V2 :
  1. `POST /api/guides/[id]/article` → distributing → generating (1/N) → summarizing → enriching → complete
  2. Automatiquement : `POST /api/guides/[id]/humanize` → humanizing → complete
- Progression détaillée affichée : phase + pourcentage
- Au clic, les contenus existants (HTML, H1, meta, score SEO) sont vidés
- Bouton secondaire **"Humaniser"** (visible si V1 existe) : ré-humanise sans régénérer V1
- Bouton **"Intro + FAQ"** : relance uniquement chapô+intro et FAQ sur la V2
- Collapsible **"Article V1 (original)"** : affiche le V1 en lecture seule
- Résultat V2 dans `guide.guideHtmlV2` → affiché dans RichEditor (éditable)

### Étape 5 — Corrections (hors scope)

**Règle fraîcheur scraping** : si un ProductIntelligence a moins de 180 jours, il n'est pas re-scrappé.

---

## Calcul des statuts des étapes (Tab Overview)

```
guide    → toujours "done"
products → "done" si products.length > 0 && tous analyzed=true
           "in_progress" si products.length > 0 && pas tous analyzed
           "locked" si products.length === 0
plan     → "done" si planHtml !== ""  (et products "done")
           "locked" sinon
article  → "done" si guideHtml !== ""  (et plan "done")
           "locked" sinon
articleV2→ "done" si guideHtmlV2 !== ""  (et article "done")
           "locked" sinon
```

---

## Intégration Serpmantics

Au submit du formulaire de création :
1. POST `/api/serpmantics/guide` avec `{ keyword, mediaName }`
2. Crée un guide Serpmantics (`POST /api/v1/guides`) avec `group: "DCE-{NomMedia}-API"`
3. Poll toutes les 5s jusqu'à prêt (sans attente initiale), timeout 10 min (`maxDuration = 600`)
4. Extrait mots-clés : `guide.guide.guide.add[]` → `{expression, from, to}`, **triés par `to` décroissant** (importance)
5. Extrait word count : `guide.guide.guide.structure.length.{from, to}`
6. Retourne `{ keywords, wordCountMin, wordCountMax, serpanticsGuideId }`
7. L'ID Serpmantics est sauvegardé sur le Guide en DB
8. Les mots-clés sont aussi triés par `max` décroissant à l'affichage (Tab Overview)

### Score SEO Serpmantics
- `POST /api/guides/[id]/score` avec `{ content: html }` → appelle `POST /api/v1/score` Serpmantics avec `saveToGuide: true`
- Retourne `{ score, keywords: [{ expression, target, current, ok }] }`
- **Score persisté en DB** : `seoScore` (Float?) + `seoKeywords` (JSON string) sauvegardés après chaque calcul
- Score rechargé automatiquement au chargement de la page (plus besoin de recalculer à chaque visite)
- Déclenché automatiquement après génération du plan (Tab Plan)
- Bouton "Recalculer" disponible dans Tab Plan et Tab Article — **NE PAS** passer directement `handleRecalculate` comme `onRecalculate`, toujours wrapper : `onRecalculate={() => handleRecalculate()}` (sinon MouseEvent est passé comme argument)
- Le lien "Score SEO Serpmantics ↗" pointe vers `https://app.serpmantics.com/{serpanticsGuideId}/edit`
- Le bouton "Recalculer" est désactivé (`disabled`) si `!html || !serpanticsUrl`

### Échelle de couleur du score SEO (non linéaire)
| Plage | Couleur |
|-------|---------|
| 0–20 | Rouge |
| 21–40 | Orange |
| 41–70 | Vert |
| 71–80 | Orange |
| > 80 | Rouge |

### SeoScoreBar — mots-clés
- N'affiche que les mots-clés avec `current === 0` (pas encore présents dans le contenu)
- Liste repliable (collapsible) — clique sur le chevron pour ouvrir
- Les pills sont affichées à titre informatif uniquement (pas de clic pour insérer)

---

## Pages de l'application

| Route | Rôle |
|-------|------|
| `/` | Page d'accueil avec bouton "Générer un guide" |
| `/guides` | Liste des guides |
| `/guides/nouveau` | Formulaire création guide (keyword + media uniquement) |
| `/guides/[id]` | Détail guide : 4 onglets (Vue d'ensemble, Produits, Plan, Article) avec vraies données API |
| `/medias` | Profils éditoriaux (ton, style, template) |
| `/produits` | Produits scrappés (page existante mais **retirée du menu** — redondante avec /intelligence) |
| `/intelligence` | Produits : données scrappées + analyses IA structurées |
| `/playground` | Playground : sélecteur guide → produit → prompt résolu complet → génération V1 → humanisation V2 |
| `/parametres` | Config runtime : 3 onglets — Prompts (13 sous-onglets dont Critères auto IA, Interdits lexicaux), Clés API (2 sélecteurs modèle IA + 4 clés API), Doc |

---

## Seed DB

```powershell
npm run db:seed
```
Crée un profil média par défaut "Blog Test Produit".

---

## Conventions de code
- Composants UI : shadcn/ui (`src/components/ui/`)
- Icônes : lucide-react
- Formulaires : state React local (pas de lib form)
- Pas de tests automatisés dans ce projet
- Commits en anglais, messages courts
- Tâches background : `executeFunction(id).catch(console.error)` sans await dans les routes Next.js

---

## Patterns à respecter
- **Prompts** → **toujours depuis la DB** (AppConfig via Paramètres), jamais de fallback hardcodé. Si un prompt manque → erreur explicite. Les constantes dans `config/prompts/route.ts` servent uniquement de valeurs par défaut pour le pré-remplissage initial
- **Clés API sensibles** → stockées en AppConfig (DB) via `POST /api/config`, jamais hardcodées
- **Affichage clés** → masquées dans `/api/config/keys` (4 derniers caractères)
- **Appels API externes** → toujours côté serveur (routes Next.js), jamais depuis le client
- **Nouveaux paramètres runtime** → utiliser AppConfig, pas de nouvelles variables d'env
- **Tâches longues** → lancées en arrière-plan (sans await), polling côté client toutes les 3s
- **Polling pattern** : POST pour lancer → GET status toutes les 3s → quand status cible, recharger guide
- **Tri produits** → après scraping, les produits sont triés par prix croissant (le moins cher en premier)

---

## Git

Remote : `https://github.com/MassiCapsule/dce-guide`

```powershell
git push
```

---

## Refonte page /guides/[id] — architecture finale

Architecture à **4 onglets** avec **vraies données API** (plus de fixtures) :
- **Vue d'ensemble** : infos guide (wordCount min/max, moyenne, produits recommandés), mots-clés collapsible triés par importance, bouton "Ajouter des produits" (visible tant que l'étape produits n'est pas "done"), progression des 5 étapes (les 2 étapes article pointent vers le même onglet)
- **Produits** : ajout ASIN(s), suppression avec AlertDialog de confirmation, lancer scraping, polling temps réel
- **Plan** : critères de sélection éditables + bouton **"Générer (IA)"** (auto-génération critères) + bouton Perplexity + bouton "Générer le plan (IA)" pleine largeur (sauvegarde auto critères, critères obligatoires) + polling + RichEditor TipTap + bouton "Valider le plan →" (sauvegarde planHtml + bascule vers onglet Article)
- **Article** : bouton "Générer l'article" (enchaîne V1→V2 automatiquement) + bouton "Humaniser" (ré-humanise V1) + barre de progression détaillée par phase + polling + RichEditor TipTap + collapsible "Article V1 (original)" en lecture seule

**Règles UX importantes :**
- Collapsible **"Titre H1"** → onglet Article, avec champ H1 éditable + 10 propositions cliquables + bouton Sauvegarder
- Collapsible **"Éléments SEO"** (Slug, Meta title, Meta description, Légende image) → onglet Article, avec bouton Sauvegarder
- Bouton **"Intro + FAQ"** → onglet Article, relance uniquement chapô+intro et FAQ sans regénérer tout l'article
- Barre d'outils RichEditor : Gras, Italique, Souligné | **H1**, H2, H3 | Liste, Liste numérotée | Tableau
- Chaque tab reçoit `guideId` + `onRefresh` pour se connecter aux API et recharger les données
- `TabPlan` reçoit aussi `onTabChange` pour basculer vers l'onglet Article après validation du plan

---

## Formulaire création guide

1 card seulement :
1. **Informations du guide** : keyword (mot-clé principal) + media

Les critères sont saisis dans l'onglet Plan après création.
Les ASINs sont ajoutés dans l'onglet Produits après création.

---

## Prompt de génération du plan — architecture

Le prompt est résolu dans cet ordre de priorité :
1. `media.promptPlan` (champ sur le média, éditable dans `/medias/[id]`)
2. `DEFAULT_PLAN_PROMPT` (hardcodé dans `plan-generator.ts`)

Le modèle IA utilisé est `model_generation` (configuré dans Paramètres > Clés API).

Note : le prompt plan n'est plus dans Paramètres. Chaque média a son propre prompt plan et structure de sortie.

Le prompt final envoyé à l'IA = `promptPlan` + `planOutputStructure` (concaténés par le code).

**Placeholders disponibles dans le prompt plan :** `#NomMedia`, `#MotClePrincipal`, `#NombreMots`, `#Criteres`, `#ResumeProduits`, `#MotsCles`, `{media.toneDescription}`, `{media.writingStyle}`, `{forbiddenWords}`

**Nommage aligné JSON :** les champs du prompt utilisent les mêmes noms que le JSON (`mots_cles`, `nombre_mots`, `mots_total`, etc.) et chaque section porte la mention `(JSON: "clé")`.

**`#ResumeProduits`** injecte pour chaque produit : nom, marque, prix, URL Amazon (`https://www.amazon.fr/dp/[ASIN]`), résumé de positionnement.

**`planOutputStructure`** : définit le format de sortie (HTML + JSON). Stocké sur le média, éditable dans `/medias`. Contient les instructions pour générer le bloc JSON entre `:::JSON_START:::` et `:::JSON_END:::`.

La réponse IA est séparée : HTML (avant `:::JSON_START:::`) → `planHtml`, JSON (entre les délimiteurs) → `planJson`.

### Plan JSON structuré

Le plan-generator demande à l'IA de produire **deux sorties** : le HTML (pour l'éditeur TipTap) et un JSON structuré (entre `:::JSON_START:::` et `:::JSON_END:::`). Le JSON est stocké dans `guide.planJson` et sert à extraire les sections de manière fiable.

**Extraction par ASIN** : au lieu de matcher les produits par titre (matching flou), le pipeline article utilise l'ASIN exact depuis le JSON. Fallback sur le parsing HTML si `planJson` est vide (rétrocompatibilité).

**Fonctions d'extraction** :
- `extractPlanSectionFromJson()` (article-generator) : extrait la section plan d'un produit par ASIN
- `extractSectionFromJson()` (enrichment-step) : extrait chapô (brief + mots-clés), introduction (brief + mots-clés), critères (brief + items numérotés), FAQ (brief + questions numérotées) par clé JSON
- `extractProductListFromJson()` (enrichment-step) : extrait la liste des produits (nom, prix, URL) pour le sommaire
- `parsePlanJson()` (plan-types) : parse et valide le JSON

---

## Prompt de génération de fiche produit — architecture

Le prompt est un **template éditable** dans Paramètres > Generation (clé `prompt_generation` en AppConfig).
Les placeholders `{variable}` sont remplacés par les vraies données au moment de la génération.

`src/lib/prompt-builder/index.ts` — construit le prompt codé en dur (utilisé par le pipeline article).
`src/lib/prompt-builder/annotated.ts` — construit le prompt depuis le template AppConfig avec annotations (utilisé par le Playground).

**Placeholders disponibles :** `{media.name}`, `{media.toneDescription}`, `{media.writingStyle}`, `{doRules}`, `{dontRules}`, `{forbiddenWords}`, `{intelligence.productTitle}`, `{intelligence.shortTitle}`, `{intelligence.productBrand}`, `{intelligence.productPrice}`, `{intelligence.asin}`, `{intelligence.positioningSummary}`, `{intelligence.keyFeatures}`, `{intelligence.detectedUsages}`, `{intelligence.buyerProfiles}`, `{intelligence.strengthPoints}`, `{intelligence.weaknessPoints}`, `{intelligence.recurringProblems}`, `{intelligence.remarkableQuotes}`, `{keyword}`, `{wordCount}`, `{planSection}`, `{media.productStructureTemplate}`

La section plan est extraite via `extractPlanSectionFromJson(planJson, planHtml, asin, productTitle)` — matching par ASIN exact depuis le JSON, fallback sur le parsing HTML.

---

## Prompt d'analyse des avis — architecture

Le prompt est un **template éditable** dans Paramètres > Analyse (clé `prompt_analysis` en AppConfig).
`src/lib/intelligence/review-analyzer.ts` charge le prompt depuis AppConfig, sinon utilise le prompt par défaut.

**Format du template :** sections `**System** :` et `**User** :` détectées automatiquement. Si absentes, tout le texte est utilisé comme user prompt avec un system prompt par défaut.

**Placeholders disponibles :** `{title}`, `{brand}`, `{price}`, `{rating}`, `{reviewCount}`, `{description}`, `{features}`, `{count}`, `{reviews}`

**Champ `shortTitle`** : l'IA génère un titre court du produit (marque + gamme + caractéristique clé) sauvegardé sur ProductIntelligence.

---

## Formulaire média — champs actifs

| Champ | Rôle |
|-------|------|
| Champ | Badge prompt | Rôle |
|-------|-------------|------|
| `name` | `{media.name}` | Nom du média |
| `description` | — | Description courte du média |
| `toneDescription` | `{media.toneDescription}` | Description du ton éditorial |
| `writingStyle` | `{media.writingStyle}` | Style d'écriture |
| `doRules` | `{doRules}` | Règles à suivre (JSON array, une par ligne) |
| `dontRules` | `{dontRules}` | Règles à éviter (JSON array, une par ligne) |
| `promptPlan` | — | Prompt plan spécifique au média (placeholders `#NomMedia`, etc.). Nommage aligné sur les clés JSON : `mots_cles`, `nombre_mots`, `mots_total`, `(JSON: "clé")` |
| `planOutputStructure` | — | Structure de sortie du plan (format HTML + JSON). Concaténé après le prompt plan. |

Champs **retirés de l'UI média** (restent en DB) : `productStructureTemplate`, `forbiddenWords`, `defaultProductWordCount`, `modelPlan`

**Badges** : chaque champ du formulaire média affiche un badge `{placeholder}` à côté du label pour indiquer la variable à utiliser dans les prompts.

---

## Historique des features

| Date | Feature |
|------|---------|
| 2026-03-11 | Bouton "Valider" Serpmantics dans guide-form |
| 2026-03-13 | Suppression section mots-clés manuels — Serpmantics automatique au submit |
| 2026-03-13 | Refonte /guides/[id] : 4 onglets + TipTap WYSIWYG + SeoScoreBar |
| 2026-03-13 | MetaFields dans Article uniquement (collapsible "Éléments SEO") + H1 dans toolbar |
| 2026-03-13 | Champ `criteria` sur Guide (migration Prisma) + section Critères dans formulaire création |
| 2026-03-13 | Prompt Perplexity critères configurable dans Paramètres (clé `prompt_criteres`) |
| 2026-03-13 | Critères déplacés du formulaire création → Tab Plan (saisie au moment de générer le plan) |
| 2026-03-13 | Page d'accueil `/` avec titre H1 + bouton "Générer un guide" |
| 2026-03-13 | wordCountMin/Max + planHtml ajoutés au modèle Guide (migrations Prisma) |
| 2026-03-13 | Refonte workflow séquentiel 5 étapes : fixtures supprimées, vraies données API |
| 2026-03-13 | Tab Products : Textarea ASIN (un par ligne), 2 boutons séparés (Ajouter / Lancer récupération) |
| 2026-03-13 | Tab Plan : génération OpenAI en arrière-plan + polling + prompt_plan configurable |
| 2026-03-13 | Tab Plan : bouton "Générer le plan (IA)" déplacé sous le bloc Critères |
| 2026-03-13 | Tab Article : génération OpenAI (distribution + fiches + assemblage) + polling |
| 2026-03-13 | Bouton "Sauvegarder" critères connecté (PATCH /api/guides/[id]) |
| 2026-03-13 | Prompt plan refactorisé : structure SAVE éditoriale La Provence, #NomMedia dynamique |
| 2026-03-13 | Champ `promptPlan` ajouté au modèle Media (migration) — prompt spécifique par média |
| 2026-03-13 | Ordre des mots-clés Serpmantics fixé (orderBy id asc sur GuideKeyword) |
| 2026-03-13 | Nettoyage automatique des balises markdown dans planHtml après génération |
| 2026-03-13 | `serpanticsGuideId` sauvegardé sur Guide + lien ↗ dans SeoScoreBar |
| 2026-03-13 | Score SEO réel via `POST /api/guides/[id]/score` (Serpmantics /api/v1/score) |
| 2026-03-13 | Score SEO auto-calculé après génération du plan (Tab Plan) |
| 2026-03-13 | Section plan du produit injectée dans le prompt de génération fiche (extractPlanSection) |
| 2026-03-13 | Champ `description` ajouté au modèle Media (migration) |
| 2026-03-13 | Retrait `dontRules` et `productStructureTemplate` du prompt de génération et de l'UI média |
| 2026-03-13 | Bouton "Valider le plan →" connecté : PATCH planHtml + switch vers onglet Article |
| 2026-03-13 | Fix bug "Recalculer" : onClick wrappé `() => handleRecalculate()` pour éviter MouseEvent comme arg |
| 2026-03-13 | SeoScoreBar : `saveToGuide: true` dans POST /api/v1/score Serpmantics |
| 2026-03-13 | URL Serpmantics corrigée : `https://app.serpmantics.com/{id}/edit` (sans `/guides/`) |
| 2026-03-13 | Timeout Serpmantics : 5min → 10min, attente initiale 1min supprimée, poll 3s → 5s |
| 2026-03-13 | Bouton "Réessayer Serpmantics" dans guide-form si échec Serpmantics |
| 2026-03-13 | Échelle couleur score SEO non linéaire (0-20 rouge, 21-40 orange, 41-70 vert, 71-80 orange, >80 rouge) |
| 2026-03-13 | SeoScoreBar : pills uniquement pour mots-clés à 0 occurrence, collapsible, clic = insertion dans plan |
| 2026-03-13 | Suppression fonctionnalité clic-insertion mot-clé dans plan (non fiable sans IA) — idée "Optimiser le plan" consignée dans docs/idees.md |
| 2026-03-18 | Suppression produits dans Tab Produits avec AlertDialog de confirmation (icône Trash2) |
| 2026-03-18 | Suppression ProductIntelligence depuis `/intelligence` avec AlertDialog (bouton au survol) |
| 2026-03-18 | Route `DELETE /api/intelligence/[id]` — supprime ProductIntelligence + fiches générées + liaisons guides |
| 2026-03-18 | Groupe Serpmantics `DCE-{NomMedia}-API` envoyé à la création du guide Serpmantics |
| 2026-03-18 | Mots-clés Serpmantics triés par importance (`to` décroissant) à l'extraction et à l'affichage |
| 2026-03-18 | Bouton "Supprimer" guide activé avec AlertDialog de confirmation + redirection vers `/guides` |
| 2026-03-18 | Bouton "Ajouter des produits" dans Tab Overview (visible tant que produits pas "done") |
| 2026-03-18 | Clés API éditables depuis /parametres > Clés API (OpenAI, Anthropic, Apify, Serpmantics) — DB prioritaire, .env en fallback |
| 2026-03-18 | Clients `getOpenAIClient()`, `getApifyClient()`, `getAnthropicClient()` lisent la clé depuis DB puis .env |
| 2026-03-18 | Client IA unifié `ai-client.ts` — `chatCompletion()` / `chatCompletionStream()` routent vers OpenAI ou Anthropic selon le modèle |
| 2026-03-18 | Modèle IA configurable par étape : `model_generation`, `model_analysis`, `model_plan` (avec fallback `openai_model`) |
| 2026-03-18 | Page Paramètres refactorisée en 2 onglets : Prompts (avec sélecteur modèle par prompt) et Clés API |
| 2026-03-18 | Modèles disponibles : OpenAI (GPT-5.4, GPT-5 Mini), Anthropic (Claude Sonnet 4, Opus 4, Haiku 4) |
| 2026-03-18 | Ordre des prompts dans Paramètres : Critères Perplexity > Analyse > Generation |
| 2026-03-18 | Fix `max_tokens` → `max_completion_tokens` pour OpenAI (GPT-5.4 et nouveaux modèles) |
| 2026-03-18 | Bouton "Générer le plan (IA)" sauvegarde automatiquement les critères avant génération |
| 2026-03-18 | Critères obligatoires : message d'erreur si vides au clic sur "Générer le plan (IA)" |
| 2026-03-18 | Suppression bouton "Sauvegarder" critères (redondant avec sauvegarde auto) |
| 2026-03-18 | UX Tab Plan : bouton Perplexity au-dessus du textarea à droite, bouton Générer pleine largeur |
| 2026-03-18 | Score SEO persisté en DB : champs `seoScore` (Float?) + `seoKeywords` (JSON) sur Guide |
| 2026-03-18 | Route `/api/guides/[id]/score` sauvegarde le score en DB après chaque calcul |
| 2026-03-18 | Score SEO rechargé depuis DB au chargement de la page (plus besoin de recalculer) |
| 2026-03-18 | Fix boucle infinie Recalculer : guard `scoreLoading` + catch réseau + sync props useEffect |
| 2026-03-18 | Page Playground `/playground` : test prompt fiche produit avec badges variables, édition libre, génération IA |
| 2026-03-18 | Prompt génération (`prompt_generation`) lu depuis AppConfig — template avec placeholders `{variable}` |
| 2026-03-18 | Prompt analyse (`prompt_analysis`) lu depuis AppConfig — template avec placeholders `{title}`, `{brand}`, etc. |
| 2026-03-18 | Champ `shortTitle` ajouté à ProductIntelligence — titre court généré par l'IA lors de l'analyse |
| 2026-03-18 | Navigation : lien "Playground" ajouté dans la sidebar |
| 2026-03-18 | Champ `forbiddenWords` ajouté au modèle Media — interdits lexicaux (JSON array), placeholder `{forbiddenWords}` |
| 2026-03-18 | Formulaire média : badges `{placeholder}` affichés à côté de chaque label pour indiquer la variable prompt |
| 2026-03-18 | Prompt plan supprimé des Paramètres — désormais uniquement sur le média (`media.promptPlan`) |
| 2026-03-18 | Onglet "Plan" retiré de la page Paramètres (reste : Critères Perplexity, Analyse, Generation) |
| 2026-03-18 | Playground : bouton "Humaniser" dans Résultat V1, section Prompt Humaniser éditable, section Résultat V2 |
| 2026-03-18 | Route `POST /api/playground/build-humanize-prompt` — résout placeholders média + injecte HTML V1 |
| 2026-03-18 | Sous-onglet "Humaniser" ajouté dans Paramètres > Prompts (clé `prompt_humaniser`) |
| 2026-03-18 | Helper `bullet()` dans prompt builders — évite le double tiret quand les règles commencent déjà par `- ` |
| 2026-03-18 | Playground : prompts passés en lecture seule (plus de mode édition) + lien "Paramètres → Prompts" sous chaque prompt |
| 2026-03-18 | Playground : bouton "Humaniser" fusionne build prompt + génération V2 en un seul clic (suppression carte intermédiaire) |
| 2026-03-18 | Placeholder `{forbiddenWords}` supporté dans le prompt humaniser (`build-humanize-prompt`) |
| 2026-03-18 | Champ `modelPlan` ajouté au modèle Media (migration) — modèle IA spécifique au média pour la génération du plan |
| 2026-03-18 | Plan-generator : priorité `media.modelPlan` > config globale `model_plan` |
| 2026-03-18 | Playground : toggle "Badges / Texte brut" pour voir le prompt avec ou sans labels de variables (onglets Fiche produit et Plan) |
| 2026-03-18 | `#MotsCles` inclut tous les mots-clés Serpmantics (suppression du `.slice(0, 30)`) — Playground et pipeline |
| 2026-03-18 | `#MotsCles` triés par importance (`minOccurrences` décroissant) — Playground et pipeline |
| 2026-03-20 | Tab Article : bouton sticky pleine largeur "Générer l'article (IA)" + barre de progression par produit (distributing → generating 1/N) |
| 2026-03-20 | Champ `guideHtmlV2` ajouté au modèle Guide (migration Prisma) — article humanisé V2 |
| 2026-03-20 | 5ème onglet "Article V2" dans /guides/[id] — humanisation de l'article V1 via prompt `prompt_humaniser` |
| 2026-03-20 | Route `POST /api/guides/[id]/humanize` — lance humanisation en arrière-plan (status: humanizing → complete) |
| 2026-03-20 | Service `humanize-step.ts` — charge prompt humaniser, résout placeholders média + `{{fiche_produit_v1}}`, appelle IA |
| 2026-03-20 | Tab Article V2 : bouton sticky "Générer l'article V2 (Humaniser)" + barre de progression simulée + polling |
| 2026-03-20 | Step "Article V2 (humanisé)" ajouté dans la progression Tab Overview |
| 2026-03-20 | Composant `Progress` de shadcn/ui ajouté (barre de progression) |
| 2026-03-20 | Pipeline article enrichi : résumé → chapô+intro, sommaire, FAQ, méta en parallèle → assemblage final |
| 2026-03-20 | 8 nouveaux champs Guide : `articleSummary`, `chapoHtml`, `sommaireHtml`, `faqHtml`, `metaTitle`, `metaDescription`, `imageCaption`, `slug` |
| 2026-03-20 | Service `enrichment-step.ts` : `generateSummary()` + `generateEnrichments()` (4 appels `Promise.allSettled`) |
| 2026-03-20 | 5 nouveaux prompts dans Paramètres : Résumé, Chapô+Intro, Sommaire, FAQ, Méta+Slug (clés `prompt_resume`, `prompt_chapo`, `prompt_sommaire`, `prompt_faq`, `prompt_meta`) |
| 2026-03-20 | MetaFields pré-remplis par IA après génération (slug, meta title, meta description, légende) + bouton "Sauvegarder" |
| 2026-03-20 | Route PATCH `/api/guides/[id]` accepte `slug`, `metaTitle`, `metaDescription`, `imageCaption` |
| 2026-03-20 | Barre de progression enrichie : distributing → generating → summarizing → enriching → complete |
| 2026-03-20 | Tab Plan : bouton sticky pleine largeur + barre de progression simulée (comme Tab Article) |
| 2026-03-20 | H1 de l'article extrait du plan (`planHtml`) au lieu de `guide.title` — fallback si pas de H1 dans le plan |
| 2026-03-20 | Prompt sommaire : H2 éditorialisé avec le mot-clé principal `{keyword}` et accords grammaticaux |
| 2026-03-20 | Prompt méta : slug basé sur le mot-clé principal, 3 mots max |
| 2026-03-20 | Prompts chapô, sommaire, FAQ : format de sortie HTML explicite (pas de markdown) |
| 2026-03-20 | Produits triés par prix croissant après scraping (positions temporaires négatives pour éviter conflit unique) |
| 2026-03-20 | Sections du plan injectées via `{planSection}` : Chapô+Intro, Critères, FAQ — extraites par `::: NomSection :::` |
| 2026-03-20 | Suppression de tous les fallbacks hardcodés — prompts chargés depuis DB uniquement, erreur si manquant |
| 2026-03-20 | Pipeline article utilise `prompt_generation` depuis Paramètres (template + placeholders) au lieu du prompt hardcodé `buildGenerationPrompt` |
| 2026-03-20 | `{planSection}` dans `prompt_generation` = section du plan du produit en cours (extrait par H3, H4→H2) |
| 2026-03-20 | Extraction plan : produits par H3, sous-titres H4 convertis en H2, sections enrichissement par H2 (Chapô, Introduction, Critères, FAQ) |
| 2026-03-20 | Conversion HTML→texte lisible (`htmlToReadableText`) pour toutes les sections plan envoyées à l'IA |
| 2026-03-20 | Onglet Doc dans Paramètres — affiche le README.md formaté en markdown |
| 2026-03-20 | Bouton "Copier" dans l'éditeur RichEditor — copie le contenu formaté (HTML + texte) pour coller avec mise en forme |
| 2026-03-20 | Tab Produits harmonisé : bouton sticky pleine largeur + barre de progression (scraping 0-50%, analyse 50-100%) |
| 2026-03-20 | Playground refactorisé : sélecteur guide → produit → prompt résolu automatiquement (plus de copier-coller manuel) |
| 2026-03-20 | API `POST /api/playground/resolve-prompt` — résout le template prompt_generation avec les vraies données guide + produit |
| 2026-03-20 | Distribution mots-clés désactivée (commentée) — mots-clés gérés par le plan via `{planSection}` |
| 2026-03-20 | Matching plan↔produit amélioré : comparaison par mots significatifs + nom de marque (>5 chars), supporte titres Amazon anglais vs plan français |
| 2026-03-25 | `forbiddenWords` déplacé du média vers AppConfig (clé `forbidden_words`) — sous-onglet "Interdits lexicaux" dans Paramètres > Prompts |
| 2026-03-25 | Helpers `loadForbiddenWords()` + `formatForbiddenWords()` dans enrichment-step.ts — centralisent le chargement depuis AppConfig |
| 2026-03-25 | Champ `forbiddenWords` retiré du formulaire média (reste en DB) |
| 2026-03-25 | Section "Critères de sélection" ajoutée au pipeline article — prompt `prompt_criteres_selection`, champ `criteresHtml`, 5ème appel parallèle |
| 2026-03-25 | Assemblage article : chapô + sommaire + **critères** + fiches + FAQ (critères insérés entre sommaire et fiches) |
| 2026-03-25 | Sous-onglet "Critères sélection" ajouté dans Paramètres > Prompts (clé `prompt_criteres_selection`) |
| 2026-03-25 | `defaultProductWordCount` retiré de l'UI média — nb mots par fiche piloté par `mots_total` du plan JSON (fallback 250) |
| 2026-03-25 | Post-traitement `stripBoldFromBody()` : supprime le gras du corps de texte, conserve uniquement dans les headings et le chapô (V1 + V2) |
| 2026-03-25 | Suppression de tous les fallbacks HTML — extraction des sections uniquement depuis le plan JSON |
| 2026-03-25 | Simplification modèles IA : 2 sélecteurs dans Paramètres > Clés API — "Modèle Article (V1)" (`model_generation`) et "Modèle Humanisation (V2)" (`model_humanization`) |
| 2026-03-25 | Suppression sélecteurs modèle par prompt (Paramètres > Prompts) et sélecteur `modelPlan` du formulaire média |
| 2026-03-25 | Clés `model_analysis`, `model_plan`, `openai_model` supprimées — tout le pipeline V1 utilise `model_generation` |
| 2026-03-25 | Plan JSON enrichi : `items` sur critères (liste des critères individuels), `items` sur FAQ (questions à traiter), `brief` sur chapô et introduction (angle éditorial) |
| 2026-03-25 | Type `PlanSectionItem` ajouté à plan-types.ts (`{ nom, description }`) + champ `items` optionnel sur `PlanSection` |
| 2026-03-25 | Extraction enrichie dans enrichment-step.ts : chapô/intro extraient le brief, critères extraient les items numérotés, FAQ extrait les questions numérotées |
| 2026-03-25 | Nouvelle fonction `extractProductListFromJson()` — injecte la liste produits (nom, prix, URL) dans le `{planSection}` du sommaire |
| 2026-03-25 | Prompts renforcés (critères + FAQ) : interdiction d'ajouter/supprimer/fusionner des éléments, ordre exact du plan, pas de "vous"/"nous comparons" |
| 2026-03-25 | `planOutputStructure` du média mis à jour : `criteres.items`, `faq.items`, `chapo.brief`, `introduction.brief` + règles JSON associées |
| 2026-03-25 | Fix balisage titres fiches : `extractPlanSectionFromJson()` envoie le titre produit en `## (H2)` et les sous-parties SAVE en `### (H3)` — l'IA respecte le niveau exact |
| 2026-03-25 | Prompt `prompt_generation` : instruction "BALISAGE" remplace "TITRES H2", h1 retiré des balises autorisées (le H1 est ajouté uniquement à l'assemblage final) |
| 2026-03-25 | Retrait de `/produits` (Fiches produit) du menu sidebar — `/intelligence` (Produits) suffit, les données brutes scrappées sont redondantes |
| 2026-03-25 | FAQ : `faq.items` retiré de l'extraction enrichment — seuls les mots-clés sont extraits, les questions sont générées librement par le prompt FAQ |
| 2026-03-25 | Champ `h1Alternatives` ajouté au modèle Guide (migration Prisma) — 10 propositions de H1 générées par le prompt méta |
| 2026-03-25 | Placeholder `{h1}` ajouté au prompt méta — H1 actuel injecté depuis planJson pour générer des alternatives |
| 2026-03-25 | `parseMetaResponse()` étendu pour extraire les propositions H1 (lignes numérotées après "Propositions H1 :") |
| 2026-03-25 | Collapsible "Titre H1" séparé de "Éléments SEO" dans Tab Article et Tab Article V2 — champ H1 éditable + 10 propositions cliquables (une par ligne) |
| 2026-03-25 | PATCH `/api/guides/[id]` accepte `guideHtml` et `guideHtmlV2` — permet de sauvegarder le H1 modifié |
| 2026-03-25 | Route `POST /api/guides/[id]/regenerate-intro-faq` — relance chapô+intro et FAQ sans regénérer tout l'article. Body `{ target: "v2" }` pour cibler le V2 |
| 2026-03-25 | Bouton "Intro + FAQ" dans Tab Article et Tab Article V2 — relance uniquement chapô+intro et FAQ avec polling |
| 2026-03-25 | Post-traitement `fixCapitalization()` : majuscule début de phrase, minuscule après `:`, majuscule premier caractère H1/H2/H3 |
| 2026-03-25 | Post-traitement gras forcé sur `<p class="chapo">` — le contenu du chapô est automatiquement enveloppé dans `<strong>` |
| 2026-03-25 | Température chapô+intro passée à 0.9 (au lieu de 0.7) pour plus de variété |
| 2026-03-25 | Post-traitements documentés dans README.md (visible dans Paramètres > Doc) |
| 2026-03-25 | Suppression automatique des italiques (`<em>`) dans le post-traitement |
| 2026-03-25 | Liens Amazon avec tag affilié : `amazon.fr/dp/ASIN?tag=dce-{motcle}-{DDMMYY}-21` — transformé automatiquement dans `fixCapitalization()` |
| 2026-03-25 | Bouton "VOIR SUR AMAZON" ajouté en `<p><strong>` après chaque ligne URL+prix — préservé par `stripBoldFromBody()` |
| 2026-03-25 | Image produit (`productImageUrl`) injectée automatiquement après le H2 de chaque fiche produit lors de l'assemblage |
| 2026-03-25 | Température méta (slug, meta title, propositions H1) passée à 0.9 |
| 2026-03-25 | Onglet "Post-traitement" en lecture seule dans Paramètres > Prompts — liste les 9 règles auto + tableau des températures IA |
| 2026-03-25 | Post-traitements appliqués uniquement sur V2 — V1 reste brut (sans correction majuscules, sans gras chapô, sans liens affiliés) |
| 2026-03-25 | Enchaînement automatique V1 → V2 : après génération V1, humanisation lancée auto + switch vers onglet Article V2 |
| 2026-03-25 | Auto-switch tabs : plan → article, article V1 → article V2 (après 1.5s) |
| 2026-03-25 | Tab Article V2 : détecte automatiquement une humanisation en cours (lancée par V1) et affiche la progression |
| 2026-03-25 | Collapsible "Article V1 (original)" dans Tab Article V2 — fermé par défaut, affiche le HTML V1 en lecture seule |
| 2026-03-25 | Champ `Brief` rendu optionnel sur `PlanProduct` — peut être retiré du `planOutputStructure` sans casser la chaîne |
| 2026-03-27 | Onglet "Article" (V1) supprimé, "Article V2" renommé en "Article" — le V1 reste visible en collapsible |
| 2026-03-27 | Bouton "Générer l'article" enchaîne V1 → V2 automatiquement avec progression détaillée par phase |
| 2026-03-27 | Au clic "Générer l'article", les contenus existants (HTML, H1, meta, score SEO) sont vidés |
| 2026-03-27 | Bouton secondaire "Humaniser" visible quand V1 existe — ré-humanise sans régénérer V1 |
| 2026-03-27 | Auto-detect au montage : reprend le polling si une génération V1 ou humanisation est déjà en cours |
| 2026-03-27 | Suppression `tab-article.tsx` (remplacé par `tab-article-v2.tsx` qui gère V1+V2) |
| 2026-03-27 | Tab Overview : 2 étapes article (rédigé + humanisé) pointent vers le même onglet "article" |
| 2026-03-27 | Prompt plan obligatoire sur le média (`media.promptPlan`) — plus de fallback `DEFAULT_PLAN_PROMPT` en production |
| 2026-03-27 | Bouton "Générer (IA)" dans Tab Plan — auto-génère les 5 critères d'achat via `POST /api/guides/[id]/criteres-auto` |
| 2026-03-27 | Nouveau prompt `prompt_criteres_auto` (clé AppConfig) — placeholder `{keyword}`, retourne JSON `[{ critere, explication }]` |
| 2026-03-27 | Sous-onglet "Criteres auto (IA)" dans Paramètres > Prompts |
| 2026-03-27 | Fix apostrophe non échappée dans `src/app/page.tsx` |
