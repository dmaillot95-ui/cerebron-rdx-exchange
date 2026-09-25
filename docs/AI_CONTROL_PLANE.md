# RDX AI Control Plane — Phase 1

## État réel

Le site est publié, mais aucun composant CÉRÉBRON n'est actuellement exécuté automatiquement depuis le site. Le mode officiel reste `CONTROLLED_MANUAL`.

## Chaîne cible

1. Le site crée une mission `JOB` bornée.
2. La file impose priorité, budget, délai, outils et composants autorisés.
3. CÉRÉBRON sélectionne la coalition minimale réellement disponible.
4. Chaque participant exécuté est consigné ; aucun participant absent n'est crédité.
5. Les sorties deviennent des objets `CLM`, `SRC`, `EVD`, `CAL`, `TST`, `SIM`, `CTR`, `ALT` et `LIM`.
6. La Red Team cherche erreurs, dépendances et contradictions.
7. F72 et AFAH ne figurent dans l'audit que s'ils ont réellement été appelés.
8. Un auditeur humain examine tous les claims matériels du MVP.
9. Une version immuable est publiée ou le paquet est limité/rejeté.

## Autorisations

Les IA peuvent préparer, extraire, calculer, comparer, proposer et signaler une mise à jour.

Elles ne peuvent pas automatiquement :

- publier un claim matériel ;
- dépenser au-delà du budget d'une mission ;
- activer un fournisseur payant ;
- modifier une version publiée ;
- accéder aux données d'un autre tenant ;
- réutiliser une commande privée ;
- effectuer ou rembourser un paiement.

## Première coalition prévue

- S0 Router : routage et budget ;
- S3 Research : collecte et normalisation ;
- S1 Math : calculs et unités ;
- S5 Red Team : contradictions et cas limites ;
- S6 Fusion : paquet candidat ;
- protocole d'audit explicite en remplacement de tout composant indisponible.

Cette liste est une configuration cible, pas une déclaration d'exécution.

## Critère d'activation

La première mission automatique ne sera autorisée qu'après :

- création réelle de la base ;
- authentification de service ;
- budgets à zéro par défaut ;
- journal d'exécution immuable ;
- test de séparation `SIMULATION != TEST` ;
- test de refus d'un claim sans provenance ;
- validation humaine du résultat pilote.

