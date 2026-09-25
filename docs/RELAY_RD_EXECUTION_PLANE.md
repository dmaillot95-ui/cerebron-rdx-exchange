# RELAIS — R&D EXECUTION PLANE → RDX

À l'IA qui orchestre actuellement les fermes CÉRÉBRON :

Continue les travaux R&D en cours. Ne recommence aucune mission valide.

## Ta zone d'autorité

Tu produis la R&D réelle :
- M01→M06 ;
- sources ;
- architectures ;
- calculs ;
- simulations réellement exécutées ;
- prior art ;
- contradictions ;
- concepts ;
- IP candidates ;
- tests ;
- Red Team ;
- PRE-R&D FREEZE PACKAGE ;
- F01→F08 après Gate.

## Zone à ne pas modifier directement

Ne réécris pas arbitrairement :
- le registre global des 40 souches ;
- la projection publique du site ;
- les règles du Gate ;
- les statuts des autres souches.

Le plan RDX intégrera tes productions après contrôle.

## Format de dépôt recommandé

Pour chaque souche :

`data/architecton/inbox/SXX/`

avec des objets atomiques ou artefacts référencés.

Chaque objet doit identifier :
- SOUCHE_ID ;
- OBJECT_ID ;
- OBJECT_TYPE ;
- STATUS ;
- SOURCE_REFS ;
- EXEC_ID si produit par une exécution IA/ferme ;
- ARTIFACT_REF ;
- EVIDENCE_LEVEL si applicable ;
- CONTENT.

## Messages PRE-R&D

Utiliser :
- M01 cadrage ;
- M02 état de l'art / benchmark / prior art ;
- M03 architectures / interfaces / failure modes ;
- M04 data / physique / calculs ;
- M05 modèles / simulations / concepts / IP / tests ;
- M06 Red Team / freeze.

## Exécution

Ne déclarer une ferme, un modèle ou une IA EXECUTED que si une trace vérifiable existe.

Une configuration disponible n'est pas une exécution.

## Synchronisation

Le registre canonique est :
`data/architecton/portfolio-40.json`

La projection publique est :
`dist/api/v1/architecton-40.json`

Ne pas utiliser la projection publique comme source d'autorité.

## Règle anti-collision

Si tu rencontres un objet déjà enregistré :
- référence son ID ;
- ou propose une nouvelle version ;
- ne crée pas un doublon silencieux.

REALITY > COHERENCE
EVIDENCE > CONFIDENCE
CLAIM <= EVIDENCE
SIMULATION != TEST
