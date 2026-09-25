# Maintenance contrôlée des vues RDX

Après une intégration approuvée ou une modification canonique ARCHITECTON :

1. ne pas éditer directement les JSON publics ;
2. exécuter :
   `node scripts/refresh-architecton-derived-views.mjs`
3. inspecter le diff ;
4. exécuter :
   `node scripts/validate-all-rdx.mjs`
5. seulement après PASS, committer les changements dérivés.

Le script de refresh met à jour :
- `dist/api/v1/architecton-40.json`
- `dist/api/v1/architecton-missions.json`
- `dist/api/v1/architecton-wave-01.json`
- `dist/api/v1/architecton-pipeline.json`

Il ne modifie pas :
- les résultats R&D ;
- les handoffs bruts ;
- le registre canonique ;
- le journal d'intégration ;
- les statuts de souches ;
- les dossiers F01→F08 ;
- les Decision Packs.

Aucune publication automatique n'est effectuée.
