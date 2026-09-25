# CÉRÉBRON R&D Exchange

Prototype indépendant de la **RDX Verified Decision Library**.

La première version présente le catalogue pilote, la méthode de preuve, les offres expérimentales et un formulaire local de demande. Aucun paiement ni stockage de données client n'est activé.

## Principes

- REALITY > COHERENCE
- EVIDENCE > CONFIDENCE
- CLAIM <= EVIDENCE
- SIMULATION != TEST
- VERIFY BEFORE COMMIT

Le site est volontairement séparé du dépôt principal CÉRÉBRON et ne modifie aucune ferme Collatz.

## Hébergement

Le prototype peut être publié indépendamment sur Vercel depuis le dossier `dist`. ChatGPT Sites reste une prévisualisation secondaire et n'est pas l'unique hébergement du projet.

## Contrôle IA

Le socle de contrôle de Phase 1 est documenté dans `docs/AI_CONTROL_PLANE.md`. Le modèle PostgreSQL initial se trouve dans `schema/rdx-v1.sql`. Aucun agent, paiement ou fournisseur payant n'est déclenché automatiquement à ce stade.

## Evidence Gate exécutable

`node scripts/validate-rdx.mjs` contrôle les dossiers de `data/packs`. GitHub Actions exécute ce contrôle à chaque modification d'un dossier. Un brouillon peut rester incomplet ; une publication est refusée si les preuves, licences, audits, empreintes ou validations humaines obligatoires manquent.


## ARCHITECTON Ω — registre des 40 souches

Le dépôt contient maintenant un plan contrôlé pour S01→S40 :

- registre canonique : `data/architecton/portfolio-40.json`
- 40 ordres M01 : `data/architecton/missions/WAVE-01` → `WAVE-08`
- inboxes R&D : `data/architecton/inbox/WAVE-01` → `WAVE-08`
- registre d'objets : `data/architecton/object-registry.json`
- journal d'intégration : `data/architecton/integration-log.json`
- pipeline public : `dist/api/v1/architecton-pipeline.json`

État de référence : aucune exécution R&D n'est revendiquée tant qu'une trace `EXEC-` vérifiable n'existe.

### Gates

- ARCHITECTON Registry Gate
- ARCHITECTON Ingest Gate
- ARCHITECTON Integration Decision Gate
- ARCHITECTON Public Projection Gate
- ARCHITECTON Pipeline Projection Gate
- ARCHITECTON F01-F08 Gate
- ARCHITECTON RDX Normalization Gate
- RDX Deployment Readiness Gate

Les niveaux de preuve ARCHITECTON `E0→E8` sont distincts du champ RDX `evidence_level`. Aucune conversion numérique directe n'est autorisée.

### Endpoints statiques

- `/api/v1/architecton-40.json`
- `/api/v1/architecton-missions.json`
- `/api/v1/architecton-wave-01.json`
- `/api/v1/architecton-pipeline.json`
- `/api/v1/status.json`

## Fiches publiques RDX

Les packs canoniques de `data/packs` sont projetés vers des vues publiques minimales par `scripts/build-rdx-public-packs.mjs`.

- `/api/v1/packs/RDX-000001.json`
- `/dossiers/RDX-000001.html`

Une fiche `SOURCED` reste explicitement non vérifiée et non publiée. La projection n'élève jamais le niveau de preuve du pack source.

## Demandes client Phase 1

Le formulaire public produit localement un objet `RDX_CLIENT_REQUEST_V1` téléchargeable. Aucun envoi serveur, stockage en base, paiement ou entraînement n'est activé. Le schéma public est disponible via `/api/v1/request-schema.json` et la politique via `/privacy.html`.

## Transparence publique

- `/status.html` affiche le statut réel des capacités et blocages à partir de `/api/v1/status.json`.
- `/api.html` documente les projections JSON publiques en lecture seule.
