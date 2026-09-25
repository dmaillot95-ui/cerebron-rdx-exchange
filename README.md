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
