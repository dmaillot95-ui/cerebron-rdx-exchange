# ARCHITECTON Ω → RDX — Contrat d'ingestion

Ce document définit comment le plan R&D transmet ses résultats au registre RDX sans collision.

## 1. Autorité

Le plan R&D est autorité sur le contenu scientifique/technique produit par les fermes et IA réellement exécutées.

Le registre RDX est autorité sur :
- l'identifiant canonique ;
- la provenance ;
- le statut ;
- la cohérence des références ;
- la projection publique.

RDX ne réécrit pas un résultat scientifique pour le faire paraître plus fort.

## 2. Unité de transmission

Chaque résultat transmis doit être un objet atomique avec :
- `object_id` ;
- `souche_id` ;
- `object_type` ;
- `status` ;
- `created_at` ;
- `producer_execution_id` lorsque produit par une exécution IA/ferme ;
- `source_refs` ;
- `artifact_ref` si applicable ;
- `evidence_level` si applicable ;
- `content`.

Types autorisés :
`SRC REQ UNK DAT FORMULA CALC ARCH RISK FAIL MODEL SIM RESULT CONCEPT IP CLAIM TEST CTR ALT LIM DEC EXEC`.

## 3. Trace d'exécution

Une production attribuée à une IA ou ferme doit pointer vers un `EXEC-` réel comportant :
`SOUCHE_ID FERME MODEL_OR_AGENT ROLE MISSION INPUT_HASH OUTPUT_HASH START END ARTIFACT STATUS`.

Sans trace : le contenu peut être stocké comme information/import manuel, mais ne peut pas être crédité à une IA ou ferme.

## 4. Statuts

Une souche ne change de statut que lorsque ses conditions sont satisfaites.

- `QUEUED` : aucune exécution revendiquée.
- `PRE_RND_ACTIVE` : M01→M05 réellement en cours.
- `PRE_RND_AUDIT` : M06 / Red Team en cours.
- `PRE_RND_FROZEN` : freeze package présent.
- `READY_FOR_F01_F08` : gate de préparation passé.
- `F01_F08_ACTIVE` : synthèse industrielle en cours.
- `ARCHITECTON_FROZEN` : F01→F08 gelées et référencées.
- `RDX_CANDIDATE` : dossier candidat à la normalisation RDX.

## 5. Anti-duplication

Avant création d'un nouvel objet :
1. chercher un ID existant pour la même information ;
2. si l'objet existe, le référencer ou le versionner ;
3. ne jamais recopier un calcul ou résultat sous un nouvel ID seulement pour une autre fiche.

## 6. Calcul / simulation / test

- `CALC-` : calcul analytique ou numérique reproductible.
- `SIM-` : simulation réellement exécutée ou explicitement TO_BE_SIMULATED.
- `TEST-` : test réel avec configuration et mesures.

`SIMULATION != TEST`.

## 7. Synchronisation avec le site

Source canonique actuelle :
`data/architecton/portfolio-40.json`.

Projection publique :
`dist/api/v1/architecton-40.json`.

La projection publique est dérivée et ne doit jamais devenir la source d'autorité.

## 8. Collision

Si deux sessions proposent une modification du même objet :
- conserver les deux artefacts bruts ;
- ne pas écraser ;
- comparer les preuves ;
- fusionner seulement après décision explicite ;
- journaliser la décision.
