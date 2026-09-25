# Evidence semantics bridge — ARCHITECTON Ω ↔ RDX

## Problème

ARCHITECTON et RDX utilisent tous deux une notion de niveau de preuve, mais **les échelles ne signifient pas la même chose**.

Exemple : dans ARCHITECTON, `E2` signifie un calcul analytique exécuté et reproductible. Dans le RDX existant, `evidence_level: 2` apparaît déjà sur des claims soutenus par des sources documentaires.

Par conséquent :

**UNE VALEUR NUMÉRIQUE IDENTIQUE N'IMPLIQUE PAS UNE ÉQUIVALENCE SÉMANTIQUE.**

## Règle

Le handoff ARCHITECTON utilise désormais :

`architecton_evidence_level: "E0" ... "E8"`

Le Decision Pack RDX conserve son champ existant :

`evidence_level: 0 ... 8`

Ils ne doivent jamais être copiés l'un dans l'autre automatiquement.

## Échelle ARCHITECTON

- E0 — hypothèse / non vérifié
- E1 — architecture / raisonnement
- E2 — calcul analytique exécuté reproductible
- E3 — simulation numérique exécutée vérifiée
- E4 — test composant
- E5 — test sous-système
- E6 — démonstrateur intégré
- E7 — environnement représentatif
- E8 — historique opérationnel

## Normalisation RDX

Lorsqu'un objet ARCHITECTON devient un claim RDX :

1. conserver son `architecton_evidence_level` ;
2. conserver ses références SRC/CALC/SIM/TEST ;
3. proposer séparément un `rdx_evidence_level` ;
4. enregistrer les `normalization_basis_refs` ;
5. faire passer la proposition par Gate / audit avant intégration.

Aucun calcul, test ou simulation ne peut être créé implicitement par la normalisation.

## Règle anti-inflation

Une source scientifique ou industrielle seule ne crée pas un E2 ARCHITECTON.

Une simulation planifiée ne crée pas E3.

Un test planifié ne crée pas E4/E5/E6/E7/E8.

REALITY > COHERENCE  
EVIDENCE > CONFIDENCE  
CLAIM <= EVIDENCE
