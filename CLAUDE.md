# CLAUDE.md — Mémoire du projet fiche-produit-generator

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
| `src/app/parametres/page.tsx` | Page config : 2 onglets (Prompts, Clés API). Prompts avec modèle IA par étape (Critères Perplexity, Analyse, Generation, Plan) |
| `src/components/editor/rich-editor.tsx` | Éditeur WYSIWYG TipTap v3 (H1/H2/H3, gras, listes, tableau) |
| `src/components/editor/seo-score-bar.tsx` | Barre score SEO Serpmantics + pills mots-clés |
| `src/components/editor/meta-fields.tsx` | Champs méta : slug, meta title, meta desc, légende image |
| `src/components/guides/tabs/tab-overview.tsx` | Onglet Vue d'ensemble : infos guide, mots-clés collapsible, bouton "Ajouter des produits", progression |
| `src/components/guides/tabs/tab-products.tsx` | Onglet Produits : ajout ASIN, suppression avec confirmation, lancer scraping + polling |
| `src/components/intelligence/intelligence-list.tsx` | Liste produits intelligence avec suppression + confirmation |
| `src/components/guides/tabs/tab-plan.tsx` | Onglet Plan : critères éditables (PATCH) + bouton Perplexity + bouton "Générer le plan (IA)" + polling + RichEditor |
| `src/components/guides/tabs/tab-article.tsx` | Onglet Article : bouton "Générer l'article (IA)" + polling + RichEditor |
| `src/app/guides/[id]/page.tsx` | Page guide : charge vraies données API, passe guideId + onRefresh à chaque tab, suppression guide avec confirmation |

### API Routes
| Route | Méthode | Rôle |
|-------|---------|------|
| `/api/guides` | POST | Créer un guide (keyword, media, criteria, keywords, wordCount, serpanticsGuideId) |
| `/api/guides/[id]` | GET | Charger un guide complet (products.intelligence + keywords) |
| `/api/guides/[id]` | PATCH | Sauvegarder `criteria` et/ou `planHtml` |
| `/api/guides/[id]` | DELETE | Supprimer un guide |
| `/api/guides/[id]/products` | POST | Ajouter des ASINs au guide (crée placeholders + GuideProducts) |
| `/api/guides/[id]/products` | DELETE | Supprimer un produit du guide (avec confirmation UI) |
| `/api/intelligence/[id]` | DELETE | Supprimer un ProductIntelligence + fiches générées + liaisons guides |
| `/api/guides/[id]/scrape` | POST | Lancer scraping + analyse en arrière-plan |
| `/api/guides/[id]/scrape` | GET | Polling statut scraping |
| `/api/guides/[id]/plan` | POST | Lancer génération du plan en arrière-plan |
| `/api/guides/[id]/article` | POST | Lancer génération de l'article en arrière-plan |
| `/api/guides/[id]/score` | POST | Calculer le score SEO Serpmantics sur un contenu HTML |
| `/api/guides/[id]/status` | GET | Statut du pipeline (status, currentStep, errorMessage) |
| `/api/guides/[id]/generate` | POST | (legacy) Pipeline complet monolithique |
| `/api/medias` | GET/POST | CRUD medias éditoriaux |
| `/api/config` | GET/POST | Lire/écrire AppConfig (DB) |
| `/api/config/keys` | GET | Afficher les clés API masquées |
| `/api/config/prompts` | GET | Prompts par défaut (analysis, generation, criteres, plan) |
| `/api/serpmantics/guide` | POST | Créer guide Serpmantics (avec `group: DCE-{NomMedia}-API`) + polling + extraction mots-clés triés par importance + wordCount + serpanticsGuideId |

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
| `src/lib/guide/scrape-step.ts` | Scraping Apify + analyse IA (modèle `model_analysis`) — status: scraping → analyzing → products-ready |
| `src/lib/guide/plan-generator.ts` | Génération du plan IA (modèle `model_plan`) — status: generating-plan → plan-ready |
| `src/lib/guide/article-generator.ts` | Distribution mots-clés + génération fiches + assemblage — status: distributing → generating → complete |

---

## Base de données (Prisma / SQLite)

### Modèles principaux
- **AppConfig** : clé-valeur pour la config runtime (modèles IA par étape, prompts, clés API)
- **Media** : profils éditoriaux avec ton, style, règles, template
- **Guide** : guide d'achat avec statut, HTML généré, coûts, wordCountMin/Max, planHtml, guideHtml
- **GuideProduct** : produits d'un guide avec allocation mots-clés
- **GuideKeyword** : mots-clés SEO d'un guide (min/max occurrences)
- **ProductIntelligence** : données scrappées + analyse IA par ASIN
- **GeneratedProductCard** : fiche HTML générée par produit

### Champs Guide importants
| Champ | Rôle |
|-------|------|
| `status` | draft → scraping → analyzing → products-ready → generating-plan → plan-ready → distributing → generating → complete (ou error) |
| `criteria` | Critères de sélection des produits (éditable dans Tab Plan) |
| `wordCountMin/Max` | Nb mots cible min/max (récupéré depuis Serpmantics) |
| `serpanticsGuideId` | ID du guide Serpmantics (sauvegardé à la création, utilisé pour le score SEO) |
| `planHtml` | Plan d'article généré par IA |
| `guideHtml` | Article complet généré par IA |

### Champs Media importants
| Champ | Rôle |
|-------|------|
| `description` | Description courte du média (affichée dans le formulaire) |
| `promptPlan` | Prompt de plan spécifique à ce média (prioritaire sur AppConfig global). Vide = utilise le global. |

### Clés AppConfig importantes
| Clé | Contenu |
|-----|---------|
| `model_generation` | Modèle IA pour la génération de fiches (ex: `gpt-5.4`, `claude-sonnet-4-20250514`) |
| `model_analysis` | Modèle IA pour l'analyse des avis |
| `model_plan` | Modèle IA pour la génération du plan |
| `openai_model` | (legacy) Fallback si les modèles par étape ne sont pas configurés |
| `prompt_generation` | Prompt pour générer les fiches produits |
| `prompt_analysis` | Prompt pour analyser les avis |
| `prompt_criteres` | Prompt Perplexity pour générer les critères (placeholder `#MotClesprincipal`) |
| `prompt_plan` | Prompt génération du plan global — placeholders : `#NomMedia`, `#MotClePrincipal`, `#NombreMots`, `#Criteres`, `#ResumeProduits`, `#MotsCles` |
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

## Workflow séquentiel — 5 étapes

La création d'un guide se fait en 5 étapes enchaînées naturellement :

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
- Saisir/modifier les critères de sélection des produits (textarea éditable + bouton "Générer via Perplexity")
- Sauvegarder les critères via `PATCH /api/guides/[id]`
- Bouton "Générer le plan (IA)" → `POST /api/guides/[id]/plan` → polling toutes les 3s
- IA génère le plan (modèle `model_plan`) avec les résumés produits + mots-clés + critères
- Résultat dans `guide.planHtml` → affiché dans RichEditor (éditable)

### Étape 4 — Générer l'article (Tab Article)
- Bouton "Générer l'article (IA)" → `POST /api/guides/[id]/article` → polling toutes les 3s
- Distribution mots-clés → génération fiche par produit → assemblage
- Résultat dans `guide.guideHtml` → affiché dans RichEditor (éditable)

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
| `/guides/[id]` | Détail guide : 4 onglets avec vraies données API |
| `/medias` | Profils éditoriaux (ton, style, template) |
| `/produits` | Produits scrappés |
| `/intelligence` | Analyses IA structurées |
| `/parametres` | Config runtime : 2 onglets — Prompts (modèle IA par étape + prompts éditables) et Clés API (OpenAI, Anthropic, Apify, Serpmantics) |

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
- **Clés API sensibles** → stockées en AppConfig (DB) via `POST /api/config`, jamais hardcodées
- **Affichage clés** → masquées dans `/api/config/keys` (4 derniers caractères)
- **Appels API externes** → toujours côté serveur (routes Next.js), jamais depuis le client
- **Nouveaux paramètres runtime** → utiliser AppConfig, pas de nouvelles variables d'env
- **Tâches longues** → lancées en arrière-plan (sans await), polling côté client toutes les 3s
- **Polling pattern** : POST pour lancer → GET status toutes les 3s → quand status cible, recharger guide

---

## Git

Remote : `https://github.com/MassiCapsule/dce-guide`

```powershell
git push
```

---

## Refonte page /guides/[id] — architecture finale

Architecture à 4 onglets avec **vraies données API** (plus de fixtures) :
- **Vue d'ensemble** : infos guide (wordCount min/max, moyenne, produits recommandés), mots-clés collapsible triés par importance, bouton "Ajouter des produits" (visible tant que l'étape produits n'est pas "done"), progression des étapes
- **Produits** : ajout ASIN(s), suppression avec AlertDialog de confirmation, lancer scraping, polling temps réel
- **Plan** : critères de sélection éditables (PATCH) + bouton Perplexity + bouton "Générer le plan (IA)" + polling + RichEditor TipTap + bouton "Valider le plan →" (sauvegarde planHtml + bascule vers onglet Article)
- **Article** : bouton "Générer l'article (IA)" + polling + RichEditor TipTap + "Éléments SEO" collapsible

**Règles UX importantes :**
- MetaFields (Slug, Meta title, Meta description, Légende image) → **Article uniquement**, dans un collapsible "Éléments SEO"
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
2. AppConfig `prompt_plan` (global, éditable dans `/parametres`)
3. `DEFAULT_PLAN_PROMPT` (hardcodé dans `plan-generator.ts`)

**Placeholders disponibles :** `#NomMedia`, `#MotClePrincipal`, `#NombreMots`, `#Criteres`, `#ResumeProduits`, `#MotsCles`

**`#ResumeProduits`** injecte pour chaque produit : nom, marque, prix, URL Amazon (`https://www.amazon.fr/dp/[ASIN]`), résumé de positionnement.

La réponse IA est nettoyée des balises markdown (` ```html ` / ` ``` `) avant sauvegarde.

---

## Prompt de génération de fiche produit — architecture

`src/lib/prompt-builder/index.ts` — construit le prompt pour chaque fiche produit :
- Contexte rédacteur + ton + style du média
- Règles "DO" du média (les règles "DON'T" ont été retirées)
- Données produit (titre, marque, prix, ASIN, positionnement, usages, avis)
- Mots-clés SEO à intégrer (allocation par produit)
- **Section du plan éditorial** correspondant à ce produit (extraite du `planHtml` par matching H2)
- Objectif de nombre de mots
- Format de sortie HTML

La section plan est extraite dans `article-generator.ts` via `extractPlanSection(planHtml, productTitle)` — compare les 20 premiers caractères du titre produit (normalisés) avec les H2 du plan.

---

## Formulaire média — champs actifs

| Champ | Rôle |
|-------|------|
| `name` | Nom du média |
| `description` | Description courte du média |
| `toneDescription` | Description du ton éditorial |
| `writingStyle` | Style d'écriture |
| `doRules` | Règles à suivre (injectées dans le prompt de génération) |
| `defaultProductWordCount` | Nombre de mots par fiche produit |
| `promptPlan` | Prompt plan spécifique (prioritaire sur AppConfig global) |

Champs **retirés de l'UI** (restent en DB, non utilisés) : `dontRules`, `productStructureTemplate`

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
| 2026-03-18 | Ordre des prompts : Critères Perplexity > Analyse > Generation > Plan |
