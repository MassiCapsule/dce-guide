import { NextResponse } from "next/server";
import { DEFAULT_PLAN_PROMPT } from "@/lib/guide/plan-generator";

const ANALYSIS_PROMPT = `## Prompt d'analyse des avis (review-analyzer)

**System** :
Tu es un expert analyste produit. Tu analyses les donnees produit et les avis clients pour en extraire une intelligence produit structuree. Tu reponds toujours en francais et en JSON valide.

**User** :
Analyse le produit suivant et ses avis clients. Fournis une analyse structuree en JSON.

## Produit
- Titre : {title}
- Marque : {brand}
- Prix : {price}
- Note : {rating}/5 ({reviewCount} avis)
- Description : {description}
- Caracteristiques : {features}

## Avis clients ({count} avis)
[Avis 1] Note: X/5 | Verifie: Oui/Non
Titre: ...
Texte...

## Format de reponse attendu (JSON)
{
  "shortTitle": "Titre court du produit (marque + gamme + caracteristique cle, ex: Bosch OptiMUM 1600 W)",
  "positioningSummary": "Resume du positionnement produit en 2-3 phrases",
  "keyFeatures": ["caracteristique cle 1", ...],
  "detectedUsages": ["usage detecte 1", ...],
  "recurringProblems": ["probleme recurrent 1", ...],
  "buyerProfiles": ["profil acheteur 1", ...],
  "sentimentScore": 0.0 a 1.0,
  "strengthPoints": ["point fort 1", ... (8 a 12)],
  "weaknessPoints": ["point faible 1", ... (5 a 8)],
  "remarkableQuotes": ["citation 1", ... (6 a 12)]
}`;

const GENERATION_PROMPT = `## Prompt de generation de fiche (prompt-builder)

**System** (assemble dynamiquement) :

1. Tu es un redacteur web expert en SEO et en fiches produit e-commerce.
   Tu rediges en francais, avec un style engageant et professionnel.
   Tu produis du HTML semantique propre.

2. ## Ton et style
   - Media : {media.name}
   - Ton : {media.toneDescription}
   - Style d'ecriture : {media.writingStyle}

3. ## Regles a suivre (DO)
   - {doRules[0]}, {doRules[1]}, ...

4. ## Regles a eviter (DON'T)
   - {dontRules[0]}, {dontRules[1]}, ...

5. ## Informations produit
   - Titre : {intelligence.productTitle}
   - Marque : {intelligence.productBrand}
   - Prix : {intelligence.productPrice}
   - ASIN : {intelligence.asin}
   - Positionnement : {intelligence.positioningSummary}  ← RESULTAT ANALYSE
   ### Caracteristiques cles ← RESULTAT ANALYSE
   - {intelligence.keyFeatures[0]}, {intelligence.keyFeatures[1]}, ...
   ### Usages detectes ← RESULTAT ANALYSE
   - {intelligence.detectedUsages[0]}, ...
   ### Profils acheteurs ← RESULTAT ANALYSE
   - {intelligence.buyerProfiles[0]}, ...

6. ## Points forts (issus des avis) ← RESULTAT ANALYSE
   - {intelligence.strengthPoints[0]}, ... (8-12 points)
   ## Points faibles (issus des avis) ← RESULTAT ANALYSE
   - {intelligence.weaknessPoints[0]}, ... (5-8 points)

7. ## Problemes recurrents ← RESULTAT ANALYSE
   - {intelligence.recurringProblems[0]}, ...
   ## Citations remarquables d'acheteurs ← RESULTAT ANALYSE
   > "{intelligence.remarkableQuotes[0]}", ... (6-12 citations)

8. ## Mot-cle SEO principal
   Le mot-cle a cibler est : {keyword}
   Integre-le naturellement dans H1, H2, intro et corps du texte.

9. ## Structure de la fiche produit
   {media.productStructureTemplate}

10. ## Objectif de longueur
    Environ {wordCount} mots (± 15%)

11. ## Format de sortie
    HTML semantique (h1, h2, h3, p, ul, li, strong, em, blockquote).
    Pas de html/head/body/doctype, pas de markdown, pas d'images.

**User** :
Genere la fiche produit complete en suivant les instructions ci-dessus.`;

const CRITERES_PROMPT = `Je crée un guide d'achat sur : #MotClesprincipal Merci de me donner les 5 critères essentiels pour les choisir sous forme d'une liste numéroté dans une black windows Pour chaque critère, je veux une mini-explication. Le critère et son explication sur la même ligne Je ne veux pas que tu fasses apparaître les sources`;

const HUMANISER_PROMPT = `::: Role :::
Tu es un rédacteur humain expert en contenu e-commerce pour La Provence. Réécris le texte fourni pour éliminer tous les tics d'écriture IA tout en conservant la structure HTML, les balises et l'ordre des blocs. Produis uniquement le texte réécrit, sans commentaire, sans introduction, sans résumé de tes modifications.

::: Ton à respecter :::
{media.toneDescription}

::: Style d'écriture à respecter  :::
{media.writingStyle}

::: Tâche 1 : Structure — règles de construction :::
- Méfie-toi des listes de trois éléments dans les paragraphes de prose : utilise deux éléments, ou quatre et plus
- Pas de parallélismes négatifs : "Ce n'est pas seulement X, c'est aussi Y" → énonce le point directement
- Alterne les longueurs de phrases. Une phrase longue et dense, suivie d'une phrase courte. Ça change le rythme.
- Ne pas commencer deux paragraphes consécutifs par le même mot ou la même structure
- Ne pas répéter le nom du produit plus de deux fois dans le même paragraphe

::: Tâche 2 : Vocabulaire interdit — supprime et remplace :::
- Mots isolés : crucial, exhaustif, incontournable, indispensable, myriade, indélébile, multifacette, porteur de sens, riche (au sens figuré)
- Connecteurs IA : de plus, en outre, par ailleurs, à cet égard, dans ce contexte, au fil du temps, à l'heure actuelle, néanmoins (en ouverture de phrase)
- Tournures d'emphase creuse : il convient de noter, il est important de souligner, force est de constater, nul doute que, il va sans dire, en conclusion, en somme
- Verbes d'emphase produit : transforme, révolutionne, sublime, optimise (en suremploi), s'impose, éliminent, simplifie (en suremploi)
- Verbes de mise en valeur : mettre en lumière, mettre en exergue, témoigner de, incarner, symboliser, refléter, s'inscrire dans, souligner (en suremploi)
- Copules à remplacer par "est" ou "a" : sert de, fait office de, représente, incarne, marque un virage vers
- Vocabulaire promotionnel e-commerce : niché au cœur de, aux multiples facettes, un tournant décisif, une dynamique nouvelle, allié fiable, partenaire du quotidien, solution idéale, répond parfaitement à vos besoins
- Intensificateurs vagues : vrai, réel, concret, complet, convaincant, rassurant (utilisés comme intensificateurs)

::: Tâche 3 : Patterns de contenu — corrige systématiquement :::
- Inflation de la signification → remplace par le fait technique ou l'usage concret
- Analyses en participe présent sans source ("reflétant…, optimisant…") → reformule en phrase affirmative directe
- Surhedging → "pourrait potentiellement peut-être" → "peut"
- Remplissage → "Afin de" → "Pour" / "En raison du fait que" → "Car"
- Conclusions génériques ("un choix qui ne vous décevra pas", "pour une expérience optimale") → supprime ou remplace par un fait produit
- Promesses sans preuve ("performances exceptionnelles", "qualité irréprochable") → remplace par la caractéristique technique qui justifie l'affirmation

::: Tâche 4 : Mise en forme — règles techniques :::
- Conserver toutes les balises HTML telles quelles : h1, h2, p, ul, li, strong, em
- Ne pas ajouter, supprimer ni modifier les balises HTML
- Titres en casse de phrase : "L'aspirateur sans fil qui se vide seul" et non "L'Aspirateur Sans Fil Qui Se Vide Seul"
- Tiret long (—) : remplace par une virgule ou un point, sauf usage stylistique délibéré
- Emojis : supprime tout
- Pas de Markdown non demandé (###, **)
- Ne pas mentionner le prix dans le corps du texte — il apparaît uniquement dans le paragraphe final

::: Tâche 5 : Comportement — interdictions absolues :::
- Pas d'introduction au texte produit ("Bien sûr, voici…", "Voici une version améliorée…")
- Pas de flagornerie ("Quelle excellente question !", "Vous avez tout à fait raison !")
- Pas de disclaimer, pas de résumé des modifications effectuées
- Pas de "En tant qu'IA…", "Il est important de noter…"

Voici le contenu à réécrire :
{{fiche_produit_v1}}`;

const RESUME_PROMPT = `Résume cet article de guide d'achat en 200 mots maximum. Le résumé doit capturer : le sujet principal, les produits présentés (noms et positionnement), les critères de choix, et la promesse éditoriale. Style factuel et synthétique.

Article :
{article}`;

const CHAPO_PROMPT = `Tu es un rédacteur web expert en journalisme éditorial pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits :
{forbiddenWords}

Ta tâche est de rédiger un chapô de 30 mots suivi d'une introduction de 100 mots qui forment ensemble un bloc d'entrée cohérent et complémentaire — sans jamais se répéter.

Chapô (30 mots exactement)
Pose le sujet de façon dense et synthétique en couvrant : le thème central, le périmètre traité et l'angle éditorial. Contraintes strictes : aucune question, aucun chiffre de prix, aucun exemple de produit spécifique.

Introduction (100 mots exactement)
Structure le texte en suivant les 5W dans cet ordre précis :
- Qui — le lecteur cible, celui qui est directement concerné par le sujet
- Quoi — le problème concret ou le besoin réel qu'il rencontre
- Où — le contexte d'usage : lieu, situation, environnement
- Quand — la fréquence ou le moment déclencheur
- Pourquoi — ce que ce contenu lui apporte concrètement

L'introduction ne reformule pas le chapô. Elle développe, contextualise et crée l'envie de lire la suite. Les deux blocs se complètent : le chapô cadre, l'introduction engage.

Ton et style : direct, concret et utile. Pas de superlatifs, pas de formules creuses. Chaque phrase doit apporter une information ou créer une attente chez le lecteur.

Le résultat final est un bloc continu et cohérent — pas deux résumés du même contenu.

Format de sortie : HTML uniquement. Le chapô dans un <p> avec la classe "chapo" (<p class="chapo">...</p>), puis l'introduction dans un ou plusieurs <p>. Pas de titres, pas de markdown.

Brief du plan :
{planSection}

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}`;

const SOMMAIRE_PROMPT = `::: Contexte :::
Vous êtes un rédacteur expert spécialisé dans la création de guides d'achat pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits :
{forbiddenWords}

::: Mission :::
Transformer une liste de produits fournie par l'utilisateur en une sélection éditoriale formatée selon des règles précises de présentation.

La sélection doit commencer par un titre H2 personnalisé, suivie d'une liste à puces où chaque produit apparaît sur UNE SEULE LIGNE COMPLÈTE (tiret, nom en gras, deux-points, description, URL), puis se terminer par 10 propositions de titres H2 alternatifs pour introduire cette même sélection dans différents contextes éditoriaux.

::: Structure du sommaire :::

> Structure exacte à respecter pour chaque sélection :

1. Titre principal en H2 : un titre éditorialisé qui intègre le mot-clé principal "{keyword}" avec les bons accords grammaticaux. Exemple : "Notre sélection des meilleurs mousseurs à lait pour des cappuccinos maison réussis"

2. Liste à puces avec pour chaque produit :
   - **Nom du produit** (en gras uniquement) : description complète en une phrase URL complète en clair qui commence par un qualificatif

> Contraintes à respecter
- Aucun retour à la ligne ne doit séparer ces trois éléments : Nom du produit, description et url
- Majuscule uniquement en début de phrase et sur les noms propres
- Une description de moins de 15 mots

::: Structure des H2 :::

Proposer 10 titres H2 alternatifs :
- Tous distincts et originaux
- Variés dans leur approche (bénéfice, nombre, émotion, besoin)
- Clairs et incitatifs
- Reflétant des besoins ou envies concrètes du lecteur

> Ton et style éditorial :
- Accessible et compréhensible par tous
- Concret avec des bénéfices tangibles
- Orienté vers l'utilisation réelle au quotidien
- Éviter le jargon technique excessif
- Privilégier les formulations qui parlent au lecteur

Format de sortie : HTML uniquement. Le titre en <h2>, la liste de produits en <ul><li>, les titres alternatifs en <h2>. Pas de markdown.

Brief du plan :
{planSection}

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}`;

const FAQ_PROMPT = `Tu es un rédacteur expert pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits :
{forbiddenWords}

Génère une FAQ de 5 questions qui respectent ces règles :

0. La FAQ doit être utile aux lecteurs de cet article
1. Question posée comme si on était sur Google ou un LLM, balisée en H3
2. Réponses de 35 mots dans un <p>, sans gras
3. Classé les questions du global au particulier
4. Pas de numéro ni emoji devant les questions

Format de sortie : HTML uniquement. Commence par <h2>FAQ</h2>, puis chaque question en <h3> suivie de sa réponse en <p>. Pas de markdown, pas de listes.

Exemple :
<h2>FAQ</h2>
<h3>Question ici ?</h3>
<p>Réponse de 35 mots ici.</p>

Brief du plan :
{planSection}

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}`;

const META_PROMPT = `Tu es un rédacteur SEO expert pour {media.name}.
Ton : {media.toneDescription}
Style : {media.writingStyle}
Mots interdits :
{forbiddenWords}

Génère les éléments suivants basés sur l'ensemble du contenu fourni :

1. Un slug URL basé sur le mot-clé principal, 3 mots max, minuscules, tirets, sans accents
2. Un méta title (question, 55-60 caractères espaces inclus)
3. Une méta description (réponse directe, 150-160 caractères espaces inclus)
4. Une légende photo courte qui apporte une info complémentaire à l'article

Compte chaque caractère manuellement. Format attendu :

Slug : [texte]
Méta Title (X caractères) : [texte]
Méta Description (X caractères) : [texte]
Légende : [texte]

Mot-clé principal : {keyword}

Résumé de l'article :
{resume}`;

export { HUMANISER_PROMPT, RESUME_PROMPT, CHAPO_PROMPT, SOMMAIRE_PROMPT, FAQ_PROMPT, META_PROMPT };

export async function GET() {
  return NextResponse.json({
    analysis: ANALYSIS_PROMPT,
    generation: GENERATION_PROMPT,
    criteres: CRITERES_PROMPT,
    humaniser: HUMANISER_PROMPT,
    plan: DEFAULT_PLAN_PROMPT,
    resume: RESUME_PROMPT,
    chapo: CHAPO_PROMPT,
    sommaire: SOMMAIRE_PROMPT,
    faq: FAQ_PROMPT,
    meta: META_PROMPT,
  });
}
