# CÉRÉBRON RDX — CHECKPOINT ARCHITECTON 40

Date : 2026-09-25  
Mode : continuation stricte / zéro interférence / réalité vérifiable

## 1. Autorité

R&D EXECUTION PLANE :
- l'autre IA et les fermes CÉRÉBRON produisent la R&D réelle ;
- M01→M06, puis F01→F08 après les gates ;
- aucune ferme/IA n'est créditée sans EXEC traçable.

RDX REGISTRY / INTEGRATION PLANE :
- ce dépôt enregistre, valide, versionne et expose les résultats ;
- il ne doit pas refaire la R&D produite par l'autre plan.

## 2. État actuel réel

- 40 souches S01→S40 enregistrées.
- 8 vagues de 5 souches.
- 40 ordres M01 READY_TO_ASSIGN.
- 8 inboxes ouvertes.
- 0 handoff R&D reçu au moment de ce checkpoint.
- 0 décision d'intégration.
- 0 objet R&D canonique.
- 0 dossier F01→F08 commencé.
- 0 normalisation ARCHITECTON→RDX.
- 0 exécution R&D revendiquée.

Ne pas transformer READY_TO_ASSIGN en EXECUTED.

## 3. Source de vérité

`data/architecton/portfolio-40.json`

Missions :
`data/architecton/missions/architecton-40-plan.json`

Inbox :
`data/architecton/inbox/WAVE-01/` → `WAVE-08/`

Objets :
`data/architecton/object-registry.json`

Intégrations :
`data/architecton/integration-log.json`

## 4. Handoff

Version obligatoire :
`ARCHITECTON-RD-HANDOFF-1.1`

Champ de preuve :
`architecton_evidence_level`

Ne jamais utiliser le champ ambigu `evidence_level` dans un handoff ARCHITECTON.

## 5. Preuve

ARCHITECTON :
- E0 hypothèse/non vérifié
- E1 architecture/raisonnement
- E2 calcul analytique exécuté reproductible
- E3 simulation numérique exécutée vérifiée
- E4 test composant
- E5 test sous-système
- E6 démonstrateur intégré
- E7 environnement représentatif
- E8 historique opérationnel

RDX conserve une échelle distincte.

Politique :
`NO_DIRECT_MAPPING`

Voir :
`config/evidence-semantics-bridge.json`

## 6. Séquence

R&D réelle
→ handoff inbox
→ ARCHITECTON Ingest Gate
→ Integration Proposal
→ décision d'intégration
→ APPROVED seulement si objets canoniques et checks complets
→ Phase Advance Proposal
→ phase suivante
→ M06
→ PRE-R&D FREEZE
→ READY_FOR_F01_F08
→ F01→F08
→ ARCHITECTON_FROZEN
→ normalisation RDX
→ Evidence Gate RDX
→ revue humaine
→ éventuelle publication.

## 7. Gates vérifiés

Runs GitHub SUCCESS connus :
- Registry Gate : 36150309050 — exige les 40 missions M01.
- Ingest Gate / phase proposals : 36150501318.
- Public Projection Gate : 36151188701.
- F01-F08 Gate : 36151283439.
- Handoff 1.1 Ingest Gate : 36151551926.
- RDX Normalization Gate : 36151638998.
- Integration Decision Gate : 36152460892.
- Pipeline Projection Gate : 36152552835.

Deployment Readiness Gate : 36152684707 — SUCCESS.

## 8. Site / API source

Le dossier publié est `dist`.

Endpoints :
- `/api/v1/status.json`
- `/api/v1/architecton-40.json`
- `/api/v1/architecton-missions.json`
- `/api/v1/architecton-wave-01.json`
- `/api/v1/architecton-pipeline.json`

La page `dist/index.html` contient :
- compteur 40 souches ;
- 40 missions M01 ;
- sélecteur WAVE-01→WAVE-08 ;
- compteurs pipeline : handoffs / intégrations / objets / dossiers.

## 9. Hébergement

`vercel.json` publie `dist`.

Le bundle source est validé par le Deployment Readiness Gate.
Ne pas affirmer que la dernière version est en production sans preuve de déploiement.
Les accès Vercel disponibles à cette session ne permettent pas encore de confirmer le projet distant.

## 10. Prochaine action réelle

Avant toute nouvelle structure, rechercher dans `data/architecton/inbox/**` un vrai handoff.

Si un handoff existe :
1. ne pas le modifier ;
2. vérifier version 1.1 ;
3. exécuter/consulter Ingest Gate ;
4. examiner Integration Proposal ;
5. intégrer seulement avec une décision traçable ;
6. ne débloquer la phase suivante qu'après APPROVED.

Si aucun handoff n'existe :
ne pas inventer de travail R&D.

REALITY > COHERENCE  
EVIDENCE > CONFIDENCE  
CLAIM <= EVIDENCE  
SIMULATION != TEST  
MEMORY != TRAINING  
AGENT COUNT != INTELLIGENCE
