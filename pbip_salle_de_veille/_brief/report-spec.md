# Report Spec : Bilan céréalier du Burkina Faso 2015-2024

## Report identity
- Report name: Bilan cerealier Burkina
- Semantic model: Bilan cerealier Burkina.SemanticModel (local, PBIP)
- Audience: décideurs et cadres du secteur agricole et de la sécurité alimentaire (ministère, partenaires, bailleurs) ; lecture rapide, puis détail régional
- Primary purpose: savoir si le pays et chaque région couvrent leurs besoins céréaliers, et comment cela évolue depuis 2015
- Delivery target: PBIP local d'abord (pas de publication Fabric)

## Semantic model binding
- Entry mode: Local Model
- Model name: Bilan cerealier Burkina
- connectionString: byPath ../Bilan cerealier Burkina.SemanticModel

## User decisions and constraints
- Scope: thème 1 « Sécurité alimentaire et bilan céréalier » choisi par l'utilisateur
- Page count: 3 (national, régions, provinces)
- Interactivity: navigateur de pages ; un seul segment (Région) sur la page Provinces ; pas d'extraction (drillthrough) au premier jet
- Design direction: au choix parmi 3 directions (voir plus bas), A recommandée
- Publishing: non
- Tooling: Power BI Desktop 2.158 (Store), CLI powerbi-report-author 0.5.0, Desktop Bridge pour les captures
- Model edit permissions: oui (modèle créé par Claude)
- Accessibility: contraste WCAG AA, texte alternatif sur chaque visuel, couleur jamais seule porteuse du sens (libellés Déficitaire / Excédentaire)
- Data caveats: trois cellules du PDF corrigées par les identités du bilan (production brute et disponible 2016, norme 2021) ; le tableau 076.2 de l'annuaire a une colonne 2019 dupliquée et n'est pas utilisé ; taux de couverture régional = moyenne simple

## Narrative
- Core story: après trois campagnes déficitaires (2021 à 2023), 2024 dégage un excédent brut de 474 milliers de tonnes et couvre 110 % des besoins ; mais 5 régions sur 13 restent sous 100 %, et le Centre (Kadiogo) ne couvre que 6 % de ses besoins.
- Audience promise: en 10 secondes, savoir si l'année est excédentaire, de combien, et où sont les poches de déficit.
- Key questions answered: 1) La production couvre-t-elle les besoins cette année et depuis 2015 ? 2) Quel rôle jouent les importations ? 3) Quelles régions et provinces sont déficitaires, et depuis quand ?

## Design identity
Trois directions proposées ; la direction retenue fixe le thème, les polices et les couleurs.

### A. « Saison des récoltes » (recommandée)
- Tone: remix Scholarly Calm × Editorial Newsroom : fond sable, titres en serif (Georgia), corps en Segoe UI, vert mil pour l'excédent, ocre latérite pour le déficit, aucun quadrillage.
- Signature: une ligne de seuil « 100 % des besoins » (ou « 0 » pour le solde) tracée sur chaque graphique, et une phrase de lecture sous chaque visuel.
- Pourquoi: sujet de politique publique et de statistique officielle ; l'ocre et le vert parlent du Sahel sans folklore ; la ligne de seuil répète partout la seule question qui compte : « au-dessus ou en dessous des besoins ? ».

### B. « Institutionnel »
- Tone: Corporate Cool : fond gris bleuté, texte ardoise, un accent cyan.
- Signature: cartes KPI à bandeau d'état (vert / ambre / rouge) selon la situation de la campagne.
- Pourquoi: sobre, adapté à une note au ministre ou à un bailleur.

### C. « Salle de veille »
- Tone: Industrial Cockpit : fond bleu nuit, chiffres très contrastés, couleur réservée aux alertes.
- Signature: valeurs d'état lumineuses sur fond sombre, alertes en ambre.
- Pourquoi: écran mural de suivi pendant la soudure ou la campagne.

## Page plan
1. La campagne 2024 en un coup d'œil
   - Archetype: Executive Summary, variant B (KPI-Strip)
   - Layout variant rationale: 5 indicateurs de poids comparable, pas de métrique héros unique
   - Purpose: dire si 2024 est excédentaire et replacer l'année dans la série
   - Visuals: 5 cartes KPI 2024 (production brute et évolution, taux de couverture, excédent brut, part des importations, disponible par habitant et écart à la norme) ; courbes disponibilités et besoins 2015-2024 ; colonnes de l'excédent brut par campagne (vert / ocre) ; colonnes groupées des échanges (importations, aides, exportations) ; note de source
   - Slicers/interactions: aucun ; cartes filtrées sur 2024
2. Les régions face à leurs besoins
   - Archetype: Comparative Benchmark, variant C (classement de 13 entités)
   - Purpose: classer les régions par taux de couverture 2024 et montrer la persistance des déficits
   - Visuals: barres classées 2024 avec seuil 100 % ; cartes « régions déficitaires » et « provinces déficitaires » ; carte thermique région × année
   - Slicers/interactions: aucun
3. Les provinces, où se loge le déficit
   - Archetype: Analytical Canvas, variant A
   - Purpose: descendre au niveau provincial dans une région choisie
   - Visuals: barres classées des provinces 2024 ; carte thermique province × année
   - Slicers/interactions: segment Région (liste déroulante) en haut à droite

## Design system summary (direction A)
- Theme name + base palette: « Saison des récoltes » ; fond de page #F6F1E7, cartes #FFFDF8, texte #2B2A26, vert mil #2F6B3B, ocre latérite #B5541B, gris pierre #A8A29E
- Color semantics: vert = excédent / couverture ≥ 100 % ; ocre = déficit / couverture < 100 % ; disponibilités en vert mil, besoins en gris foncé ; importations en sable foncé #C9A66B, aides #7A8B6F, exportations #A8A29E
- Typography pairing: Georgia (titres de page, valeurs KPI) + Segoe UI (étiquettes, axes)
- Layout pattern: grille 12 x 12, marges 32 px, gouttière 24 px, densité moyenne
- Accessibility commitments: contraste AA ; libellé « Déficitaire / Excédentaire » en plus de la couleur ; texte alternatif sur chaque visuel

## Model requirements
- Existing measures: 25 mesures dans Bilan céréalier, Couverture régionale, Couverture provinciale
- New measures: aucune requise ; mesures de couleur conditionnelle ajoutées à la construction si besoin
- Relationship/sort requirements: aucun

## Canonical design contract

```yaml
Design Brief:
  generated_by: powerbi-report-cli
  contract_version: 1
  mode: greenfield
  design_identity:
    tone: "Saison des récoltes : remix Scholarly Calm x Editorial Newsroom ; fond sable #F6F1E7, cartes #FFFDF8, titres Georgia, corps Segoe UI, vert mil #2F6B3B pour l'excédent, ocre latérite #B5541B pour le déficit, sans quadrillage"
    signature: "Ligne de seuil (100 % des besoins, ou 0 pour un solde) tracée sur chaque graphique, et phrase de lecture en sous-titre sous chaque visuel"
  archetype: Executive Summary
  navigation_model: page_navigator
  color_map:
    - measure: "'Bilan céréalier'[Disponibilités]"
      color: "#2F6B3B"
      tint: "#DCE9DF"
    - measure: "'Bilan céréalier'[Besoins céréaliers]"
      color: "#4A4740"
      tint: "#E7E4DD"
    - measure: "'Bilan céréalier'[Excédent brut]"
      color: "#2F6B3B"
      tint: "#B5541B"
    - measure: "'Bilan céréalier'[Importations commerciales]"
      color: "#C9A66B"
      tint: "#F2E6CF"
    - measure: "'Bilan céréalier'[Aides alimentaires]"
      color: "#7A8B6F"
      tint: "#E3E8DF"
    - measure: "'Bilan céréalier'[Exportations]"
      color: "#A8A29E"
      tint: "#EEECEA"
    - measure: "'Couverture régionale'[Taux de couverture régional]"
      color: "#2F6B3B"
      tint: "#B5541B"
    - measure: "'Couverture provinciale'[Taux de couverture provincial]"
      color: "#2F6B3B"
      tint: "#B5541B"
  pages:
    - name: "La campagne 2024 en un coup d'œil"
      role: landing
      archetype: Executive
      layout_variant: B
      variant_rationale: "Cinq indicateurs de poids comparable (production, couverture, solde, importations, disponible par habitant) et aucune métrique héros unique."
      navigation:
        - element: page_navigator
          action: PageNavigation
          target: all
          label: "Pages du rapport"
      page_background: "#F6F1E7"
      layout_summary: "Bande titre, bande de 5 KPI 2024, deux graphiques de série 2015-2024 côte à côte, bande des échanges extérieurs, note de source."
      layout_contract:
        canvas: { width: 1920, height: 1080, margin: 32, gutter: 24, snap: 8 }
        grid:
          columns: 12
          rows: 12
          regions:
            header:  [1, 1, 9, 2]
            nav:     [9, 1, 13, 2]
            kpis:    [1, 2, 13, 4]
            hero:    [1, 4, 8, 9]
            side:    [8, 4, 13, 9]
            detail:  [1, 9, 13, 12]
            footer:  [1, 12, 13, 13]
        placements:
          - id: page_title
            region: header
            kind: textbox
            text: "2024 : premier excédent céréalier depuis 2020, après trois campagnes déficitaires"
            purpose: "Donner la conclusion avant tout graphique."
          - id: page_nav
            region: nav
            kind: pageNavigator
            purpose: "Passer aux pages Régions et Provinces."
          - id: kpi_production
            region: kpis
            kind: cardVisual
            purpose: "Combien a-t-on produit en 2024, et quelle évolution sur un an ?"
            field_bindings: { value: "'Bilan céréalier'[Production brute]", reference: "'Bilan céréalier'[Évolution de la production]", filter: "Année[Année] = 2024" }
            color_strategy: measure_match
            slot: 1
            of: 5
          - id: kpi_couverture
            region: kpis
            kind: cardVisual
            purpose: "La production couvre-t-elle les besoins en 2024 ?"
            field_bindings: { value: "'Bilan céréalier'[Taux de couverture]", filter: "Année[Année] = 2024" }
            insight_basis: "Seuil de 100 % rappelé dans l'étiquette."
            color_strategy: semantic
            slot: 2
            of: 5
          - id: kpi_excedent
            region: kpis
            kind: cardVisual
            purpose: "Quel est le solde brut (disponibilités moins besoins) en 2024 ?"
            field_bindings: { value: "'Bilan céréalier'[Excédent brut]", reference: "'Bilan céréalier'[Situation de la campagne]", filter: "Année[Année] = 2024" }
            color_strategy: semantic
            slot: 3
            of: 5
          - id: kpi_importations
            region: kpis
            kind: cardVisual
            purpose: "Quelle part des ressources vient de l'extérieur en 2024 ?"
            field_bindings: { value: "'Bilan céréalier'[Part des importations]", filter: "Année[Année] = 2024" }
            color_strategy: measure_match
            slot: 4
            of: 5
          - id: kpi_par_habitant
            region: kpis
            kind: cardVisual
            purpose: "Combien de céréales par habitant, comparé à la norme de 190 kg ?"
            field_bindings: { value: "'Bilan céréalier'[Disponible par habitant]", reference: "'Bilan céréalier'[Écart à la norme]", filter: "Année[Année] = 2024" }
            color_strategy: semantic
            slot: 5
            of: 5
          - id: trend_dispo_besoins
            region: hero
            kind: lineChart
            purpose: "Les disponibilités couvrent-elles les besoins chaque année depuis 2015 ?"
            field_bindings: { Category: "Année[Année]", Y: ["'Bilan céréalier'[Disponibilités]", "'Bilan céréalier'[Besoins céréaliers]"] }
            sort_policy: natural_order
            color_strategy: measure_match
          - id: bars_excedent
            region: side
            kind: columnChart
            purpose: "Quelles campagnes sont excédentaires ou déficitaires, et de combien ?"
            field_bindings: { Category: "Année[Année]", Y: "'Bilan céréalier'[Excédent brut]" }
            sort_policy: natural_order
            color_strategy: semantic
            insight_basis: "Ligne de seuil à 0 ; colonnes vertes au-dessus, ocre en dessous."
          - id: bars_echanges
            region: detail
            kind: clusteredColumnChart
            purpose: "Combien le pays importe-t-il, reçoit-il en aide et exporte-t-il chaque année ?"
            field_bindings: { Category: "Année[Année]", Y: ["'Bilan céréalier'[Importations commerciales]", "'Bilan céréalier'[Aides alimentaires]", "'Bilan céréalier'[Exportations]"] }
            sort_policy: natural_order
            color_strategy: measure_match
          - id: source_note
            region: footer
            kind: textbox
            text: "Source : Annuaire des statistiques agro-pastorales et halieutiques 2024, MARAH/DGESS (tableaux 076.1 et 076.3, MAAH/CPSA et EPA). Quantités en milliers de tonnes."
            purpose: "Citer la source et l'unité."
        space_audit:
          content_cell_count: 132
          placed_cell_count: 132
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region: { name: hero, pct_of_content: 27 }
          balance_rationale: "La série disponibilités / besoins prouve le titre et reçoit la plus grande zone ; le solde par campagne à côté donne la lecture en un coup d'œil ; les échanges en bande basse complètent sans voler la place."
    - name: "Les régions face à leurs besoins"
      role: detail
      archetype: Comparative
      layout_variant: C
      variant_rationale: "13 régions classées sur une seule métrique ; la position par rapport au seuil de 100 % est le message."
      navigation:
        - element: page_navigator
          action: PageNavigation
          target: all
          label: "Pages du rapport"
      page_background: "#F6F1E7"
      layout_summary: "Classement 2024 des régions à gauche, deux cartes de comptage à droite, carte thermique région x année en bas."
      layout_contract:
        canvas: { width: 1920, height: 1080, margin: 32, gutter: 24, snap: 8 }
        grid:
          columns: 12
          rows: 12
          regions:
            header:  [1, 1, 9, 2]
            nav:     [9, 1, 13, 2]
            hero:    [1, 2, 9, 7]
            counts:  [9, 2, 13, 7]
            detail:  [1, 7, 13, 12]
            footer:  [1, 12, 13, 13]
        placements:
          - id: page_title
            region: header
            kind: textbox
            text: "5 régions sur 13 ne couvrent pas leurs besoins céréaliers en 2024"
            purpose: "Donner la conclusion régionale."
          - id: page_nav
            region: nav
            kind: pageNavigator
            purpose: "Changer de page."
          - id: bars_regions_2024
            region: hero
            kind: barChart
            purpose: "Quelles régions couvrent leurs besoins en 2024, et lesquelles non ?"
            field_bindings: { Category: "Région[Région]", X: "'Couverture régionale'[Taux de couverture régional]", filter: "Année[Année] = 2024" }
            sort_policy: value_desc
            color_strategy: semantic
            insight_basis: "Ligne de seuil 100 % ; barres ocre sous le seuil."
          - id: card_regions_deficit
            region: counts
            kind: cardVisual
            purpose: "Combien de régions sont déficitaires en 2024 ?"
            field_bindings: { value: "'Couverture régionale'[Régions déficitaires]", filter: "Année[Année] = 2024" }
            callout_value_basis: "Comptage sous seuil, absent du graphique voisin qui montre des taux."
            color_strategy: semantic
            slot: 1
            of: 2
          - id: card_provinces_deficit
            region: counts
            kind: cardVisual
            purpose: "Combien de provinces sont déficitaires en 2024 ?"
            field_bindings: { value: "'Couverture provinciale'[Provinces déficitaires]", filter: "Année[Année] = 2024" }
            callout_value_basis: "Comptage provincial, niveau non montré sur cette page."
            color_strategy: semantic
            slot: 2
            of: 2
          - id: heatmap_regions
            region: detail
            kind: pivotTable
            purpose: "Quelles régions sont déficitaires de façon persistante depuis 2015 ?"
            field_bindings: { Rows: "Région[Région]", Columns: "Année[Année]", Values: "'Couverture régionale'[Taux de couverture régional]" }
            sort_policy: category_asc
            color_strategy: gradient
            insight_basis: "Fond de cellule divergent centré sur 100 % (ocre en dessous, vert au-dessus)."
          - id: source_note
            region: footer
            kind: textbox
            text: "Taux de couverture des besoins céréaliers par région (tableau 076.3, EPA 2015-2024). Moyenne simple quand plusieurs années sont combinées."
            purpose: "Source et méthode."
        space_audit:
          content_cell_count: 132
          placed_cell_count: 132
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region: { name: detail, pct_of_content: 45 }
          balance_rationale: "La carte thermique porte 130 valeurs (13 x 10) et a besoin de hauteur ; le classement 2024 reste lisible avec 13 barres sur 5 rangées."
    - name: "Les provinces, où se loge le déficit"
      role: detail
      archetype: Analytical
      layout_variant: A
      variant_rationale: "45 provinces filtrées par région ; un segment et deux vues complémentaires (classement et persistance)."
      navigation:
        - element: page_navigator
          action: PageNavigation
          target: all
          label: "Pages du rapport"
      page_background: "#F6F1E7"
      layout_summary: "Segment Région en haut à droite, classement des provinces 2024 à gauche, carte thermique province x année à droite."
      layout_contract:
        canvas: { width: 1920, height: 1080, margin: 32, gutter: 24, snap: 8 }
        grid:
          columns: 12
          rows: 12
          regions:
            header:  [1, 1, 7, 2]
            nav:     [7, 1, 10, 2]
            filters: [10, 1, 13, 2]
            hero:    [1, 2, 6, 12]
            detail:  [6, 2, 13, 12]
            footer:  [1, 12, 13, 13]
        placements:
          - id: page_title
            region: header
            kind: textbox
            text: "Les provinces, où se loge le déficit"
            purpose: "Annoncer la page ; le segment précise la région."
          - id: page_nav
            region: nav
            kind: pageNavigator
            purpose: "Changer de page."
          - id: region_slicer
            region: filters
            kind: slicer
            field_bindings: Région[Région]
            slicer_type: dropdown
          - id: bars_provinces_2024
            region: hero
            kind: barChart
            purpose: "Quelles provinces couvrent leurs besoins en 2024 ?"
            field_bindings: { Category: "'Couverture provinciale'[Province]", X: "'Couverture provinciale'[Taux de couverture provincial]", filter: "Année[Année] = 2024" }
            sort_policy: value_asc
            color_strategy: semantic
            insight_basis: "Ligne de seuil 100 % ; tri du plus faible au plus fort."
          - id: heatmap_provinces
            region: detail
            kind: pivotTable
            purpose: "Le déficit d'une province est-il ponctuel ou chronique ?"
            field_bindings: { Rows: "'Couverture provinciale'[Province]", Columns: "Année[Année]", Values: "'Couverture provinciale'[Taux de couverture provincial]" }
            sort_policy: category_asc
            color_strategy: gradient
          - id: source_note
            region: footer
            kind: textbox
            text: "Taux de couverture des besoins céréaliers par province (tableau 076.3, EPA 2015-2024)."
            purpose: "Source."
        space_audit:
          content_cell_count: 120
          placed_cell_count: 120
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region: { name: detail, pct_of_content: 58 }
          balance_rationale: "La carte thermique (jusqu'à 45 provinces x 10 ans) est la preuve principale de la page ; le classement à gauche reste lisible sur 10 rangées."
  interaction_pattern:
    drill_targets: []
    cross_filter_rules: "Filtre par défaut ; aucun filtrage croisé sur les cartes KPI (filtrées sur 2024)."
  accessibility:
    alt_text_strategy: "headline+trend : chaque visuel reçoit une phrase qui dit ce qu'il montre et la conclusion."
    contrast_notes: "Ocre #B5541B et vert #2F6B3B sur #FFFDF8 passent AA pour le texte ; libellés en plus de la couleur."
  theme:
    base: "references/design/assets/base.json adapté à la direction retenue"
    user_overrides: "aucun"
```

## Implementation notes
- Model changes: aucune ; mesures de couleur conditionnelle si nécessaire
- PBIR/report authoring: thème personnalisé, 3 pages FHD, visuels générés via la CLI powerbi-report-author
- Validation: `powerbi-report-author validate` après chaque lot
- Desktop screenshot verification: Desktop Bridge, captures de chaque page
- Publishing boundary: local seulement
- Risks: le classement par mesure dans un graphique filtré, le formatage conditionnel divergent de la matrice et la ligne de seuil sont les points les plus délicats en PBIR
