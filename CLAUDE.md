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
- Analyse les avis avec **OpenAI GPT-4o**
- Génère des fiches HTML optimisées SEO
- Intègre **Serpmantics** pour les mots-clés sémantiques

---

## Stack technique
- **Next.js 14** App Router + TypeScript
- **SQLite** via Prisma ORM (`dev.db`)
- **Tailwind CSS** + shadcn/ui (Radix) + **@tailwindcss/typography**
- **TipTap v3** (éditeur WYSIWYG — installé le 2026-03-13)
- **OpenAI** (génération + analyse)
- **Apify** (scraping Amazon)
- **Serpmantics** (guide sémantique + mots-clés)

---

## Architecture des fichiers clés

### Frontend
| Fichier | Rôle |
|---------|------|
| `src/components/guides/guide-form.tsx` | Formulaire création guides — appelle Serpmantics automatiquement au clic "Créer le guide" |
| `src/app/parametres/page.tsx` | Page config : clés API, modèle OpenAI, prompts |
| `src/hooks/use-guide-generation.ts` | Polling du pipeline de génération |
| `src/components/editor/rich-editor.tsx` | Éditeur WYSIWYG TipTap v3 (H2/H3, gras, listes, tableau) |
| `src/components/editor/seo-score-bar.tsx` | Barre score SEO Serpmantics + pills mots-clés |
| `src/components/editor/meta-fields.tsx` | Champs méta : slug, meta title, meta desc, légende image |
| `src/components/guides/tabs/tab-overview.tsx` | Onglet Vue d'ensemble du guide |
| `src/components/guides/tabs/tab-products.tsx` | Onglet liste des produits |
| `src/components/guides/tabs/tab-plan.tsx` | Onglet Plan : SeoScoreBar + MetaFields + RichEditor |
| `src/components/guides/tabs/tab-article.tsx` | Onglet Article : SeoScoreBar + MetaFields + RichEditor |

### API Routes
| Route | Méthode | Rôle |
|-------|---------|------|
| `/api/guides` | POST | Créer un guide |
| `/api/guides/[id]/generate` | POST | Lancer le pipeline |
| `/api/guides/[id]/status` | GET | Statut du pipeline (polling) |
| `/api/medias` | GET/POST | CRUD medias éditoriaux |
| `/api/config` | GET/POST | Lire/écrire AppConfig (DB) |
| `/api/config/keys` | GET | Afficher les clés API masquées |
| `/api/serpmantics/guide` | POST | Créer guide Serpmantics + polling + extraction mots-clés |

### Lib / Services
| Fichier | Rôle |
|---------|------|
| `src/lib/openai.ts` | Client OpenAI singleton |
| `src/lib/apify.ts` | Client Apify singleton |
| `src/lib/prisma.ts` | Client Prisma singleton |
| `src/lib/keywords/distributor.ts` | Distribution mots-clés entre produits |
| `src/lib/guide/pipeline.ts` | Pipeline complet (scraping → analyse → distribution → génération) |

---

## Base de données (Prisma / SQLite)

### Modèles principaux
- **AppConfig** : clé-valeur pour la config runtime (modèle OpenAI, prompts, clé Serpmantics)
- **Media** : profils éditoriaux avec ton, style, règles, template
- **Guide** : guide d'achat avec statut, HTML généré, coûts
- **GuideProduct** : produits d'un guide avec allocation mots-clés
- **GuideKeyword** : mots-clés SEO d'un guide (min/max occurrences)
- **ProductIntelligence** : données scrappées + analyse IA par ASIN
- **GeneratedProductCard** : fiche HTML générée par produit

### Clés AppConfig importantes
| Clé | Contenu |
|-----|---------|
| `openai_model` | Modèle OpenAI à utiliser (ex: `gpt-4o`) |
| `prompt_generation` | Prompt pour générer les fiches |
| `prompt_analysis` | Prompt pour analyser les avis |
| `serpmantics_api_key` | Clé API Serpmantics (saisie depuis /parametres) |

---

## Variables d'environnement (.env)
```
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."
APIFY_API_TOKEN="apify_api_..."
SERPMANTICS_API_KEY=""   ← fallback si pas configurée en DB
```

> La clé Serpmantics est prioritairement lue depuis AppConfig (DB), sinon depuis .env.

---

## Pipeline de génération d'un guide
1. **SCRAPING** — Apify scrape les produits + avis Amazon
2. **ANALYZING** — GPT-4o analyse les avis → ProductIntelligence
3. **DISTRIBUTING** — Distribue les mots-clés entre les produits (respect min/max)
4. **GENERATING** — GPT-4o génère une fiche HTML par produit
5. **COMPLETE** — Assemble le guide final

Statut suivi dans `Guide.status` + `Guide.currentStep` avec polling côté client.

---

## Intégration Serpmantics
**Bouton "Valider"** dans le formulaire de création de guide :
1. POST `/api/serpmantics/guide` avec `{ keyword }`
2. Crée un guide Serpmantics (`POST /api/v1/guides`)
3. Polling toutes les 3s jusqu'à prêt (`GET /api/v1/guide?id=...`)
4. Extrait `guide.guide.guide.add[]` → mappe `from`→`min`, `to`→`max`
5. Pré-remplit le tableau des mots-clés SEO du formulaire

**Structure réponse Serpmantics :**
- `guide.guide.guide.add[].expression` → mot-clé
- `guide.guide.guide.add[].from` → min occurrences
- `guide.guide.guide.add[].to` → max occurrences

---

## Pages de l'application

| Route | Rôle |
|-------|------|
| `/guides` | Liste des guides |
| `/guides/nouveau` | Formulaire création guide (ASIN, mots-clés, media) |
| `/guides/[id]` | Détail + progression pipeline |
| `/medias` | Profils éditoriaux (ton, style, template) |
| `/produits` | Produits scrappés |
| `/intelligence` | Analyses IA structurées |
| `/parametres` | Config runtime : clés API, modèle OpenAI, prompts |

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

---

## Patterns à respecter
- **Clés API sensibles** → stockées en AppConfig (DB) via `POST /api/config`, jamais hardcodées
- **Affichage clés** → masquées dans `/api/config/keys` (4 derniers caractères)
- **Appels API externes** → toujours côté serveur (routes Next.js), jamais depuis le client
- **Nouveaux paramètres runtime** → utiliser AppConfig, pas de nouvelles variables d'env

---

## Git

Remote : `https://github.com/MassiCapsule/dce-guide`

```powershell
git push
```

---

## Workflow Serpmantics (guide-form.tsx)

Au clic "Créer le guide" :
1. Appel `POST /api/serpmantics/guide` — attend **1 min**, puis poll toutes les **3s**, timeout **5 min**
2. Récupère les mots-clés automatiquement
3. Crée le guide en DB et redirige vers `/guides/[id]`

---

## Refonte page /guides/[id] (terminée — 2026-03-13)

Architecture à 4 onglets (shadcn/ui Tabs) — données fictives dans `/fixtures/` :
- **Vue d'ensemble** : infos guide, critères de sélection (éditables), progression des étapes avec liens vers onglets
- **Produits** : liste avec statut done/pending/error, image, prix, note, bouton "Lancer la récupération"
- **Plan** : SeoScoreBar + RichEditor TipTap + boutons "Générer le plan (IA)" et "Valider le plan →"
- **Article** : SeoScoreBar + section "Éléments SEO" collapsible (fermée par défaut) + RichEditor TipTap + bouton "Générer l'article (IA)"

**Règles UX importantes :**
- MetaFields (Slug, Meta title, Meta description, Légende image) → **Article uniquement**, dans un collapsible "Éléments SEO"
- Barre d'outils RichEditor : Gras, Italique, Souligné | **H1**, H2, H3 | Liste, Liste numérotée | Tableau

---

## Historique des features

| Date | Feature |
|------|---------|
| 2026-03-11 | Bouton "Valider" Serpmantics dans guide-form |
| 2026-03-13 | Suppression section mots-clés manuels — Serpmantics automatique au submit |
| 2026-03-13 | Refonte /guides/[id] : 4 onglets + TipTap WYSIWYG + SeoScoreBar |
| 2026-03-13 | MetaFields dans Article uniquement (collapsible "Éléments SEO") + H1 dans toolbar |
