# CÉRÉBRON × ARCHITECTON Ω × RDX — Protocole de coordination

Mode : zéro interférence / R&D centralisée / registre RDX.

## Séparation des responsabilités

Le plan R&D conserve la responsabilité de l'exécution scientifique et technique réelle :
- orchestration des fermes et IA réellement disponibles ;
- recherche, sources, architectures, calculs, simulations exécutées, prior art, tests, Red Team ;
- production des PRE-R&D FREEZE PACKAGES et préparation F01→F08.

Le plan RDX conserve la responsabilité de la structure et de l'intégration :
- registre canonique ;
- IDs, provenance, Evidence Gate ;
- états des souches ;
- graphe de dépendances ;
- indexation et exposition sur le site ;
- contrôle des doublons et validation de cohérence.

## Règle anti-collision

R&D EXECUTION → produit les résultats.

RDX REGISTRY → structure, référence, audite, versionne et expose les résultats.

Ne jamais recréer indépendamment le même calcul, modèle, simulation, claim ou architecture.

UNE INFORMATION = UN ID = UNE SOURCE CANONIQUE.

## Chaîne obligatoire par souche

QUEUED
→ PRE_RND_ACTIVE
→ PRE_RND_AUDIT
→ PRE_RND_FROZEN
→ READY_FOR_F01_F08
→ F01_F08_ACTIVE
→ ARCHITECTON_FROZEN
→ RDX_CANDIDATE

Chaque souche doit passer :
- M01 — cadrage total ;
- M02 — état de l'art / sources / benchmark / prior art ;
- M03 — architectures / interfaces / failure modes ;
- M04 — data / physique / formules / calculs ;
- M05 — modèles / simulations / concepts / IP / tests ;
- M06 — Red Team / audit / freeze.

Puis seulement F01→F08.

## Exécution réelle

Tout participant réellement exécuté doit recevoir un EXEC_ID et une trace avec :
SOUCHE_ID, ferme, IA/modèle, rôle, mission, input, output, date, artefact, statut.

Un composant configuré mais non exécuté reste PLANNED ou AVAILABLE, jamais EXECUTED.

F72 et AFAH ne sont crédités que si une trace d'exécution existe.

## Principes

REALITY > COHERENCE  
EVIDENCE > CONFIDENCE  
CLAIM <= EVIDENCE  
VERIFY BEFORE COMMIT  
ABLATION BEFORE ADDITION  
SIMULATION != TEST  
MEMORY != TRAINING  
AGENT COUNT != INTELLIGENCE
