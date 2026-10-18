// Générateur PBIR du rapport « Bilan céréalier du Burkina Faso ».
// Lit le cahier des charges validé (_brief/report-spec.md) et écrit le thème, les pages et les visuels.
// Usage : node generer_rapport.js [A|C]
//   A = Saison des récoltes (dossier pbip), C = Salle de veille (dossier pbip_salle_de_veille)
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIRECTION = (process.argv[2] || 'A').toUpperCase();
const PROJET = DIRECTION === 'C' ? 'pbip_salle_de_veille' : 'pbip';
const REPORT = path.resolve(__dirname, '..', PROJET, 'Bilan cerealier Burkina.Report');
const DEF = path.join(REPORT, 'definition');
const VISUAL_SCHEMA = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json';
const PAGE_SCHEMA = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json';

// ---------- Palettes ----------
// mil = couleur « favorable » (excédent, couverture), ocre = couleur « alerte » (déficit)
const PALETTES = {
  // A. Saison des récoltes : fond sable, titres serif, vert mil et ocre latérite
  A: {
    theme: 'SaisonDesRecoltes', display: 'Georgia', value: 'Georgia',
    page: '#F6F1E7', card: '#FFFDF8', band: '#1F4A2A', ink: '#2B2A26', muted: '#6F6A60', rule: '#E4DCCB',
    mil: '#2F6B3B', ocre: '#B5541B', besoins: '#4A4740', import: '#C9A66B', aide: '#7A8B6F', export: '#A8A29E',
    kicker: '#C9D8C6', onBand: '#F6F1E7', total: '#1F4A2A', valueInk: '#2B2A26', tileSel: '#DCE9DF',
    navFill: '#2F6B3B', navText: '#F6F1E7', navSel: '#F6F1E7', navSelText: '#1F4A2A', applied: '#EFE6D3',
  },
  // C. Salle de veille : bleu nuit, chiffres lumineux, cyan pour le favorable, ambre réservé aux alertes
  C: {
    theme: 'SalleDeVeille', display: 'Segoe UI Semibold', value: 'Segoe UI Semibold',
    page: '#120E2A', card: '#1C1838', band: '#0B0820', ink: '#ECEAF7', muted: '#A9A4CC', rule: '#2E2A4A',
    mil: '#8CEEEE', ocre: '#F5A524', besoins: '#7D77A8', import: '#5772D9', aide: '#7D77A8', export: '#4A4670',
    kicker: '#8CEEEE', onBand: '#ECEAF7', total: '#ECEAF7', valueInk: '#8CEEEE', tileSel: '#1E5A63',
    navFill: '#1C1838', navText: '#ECEAF7', navSel: '#8CEEEE', navSelText: '#120E2A', applied: '#2E2A4A',
    // Les phrases de lecture nomment les couleurs : on les traduit dans la palette C
    mots: [
      ['ressources en vert, emplois en ocre', 'ressources en cyan, emplois en ambre'],
      ['Ocre : région déficitaire ; trait noir : seuil de 100 %.', 'Ambre : région déficitaire ; trait clair : seuil de 100 %.'],
      ['Ocre foncé : moins de 50 % ; ocre : 50 à 79 % ; sable : 80 à 99 % ; vert clair : 100 à 149 % ; vert : 150 % et plus.',
        'Ambre vif : moins de 50 % ; ambre : 50 à 79 % ; ambre sombre : 80 à 99 % ; sarcelle : 100 à 149 % ; cyan : 150 % et plus.'],
      ['Brun : déficit chronique', 'Ambre vif : déficit chronique'],
      ['; ocre : récent ; vert gris : sorti ; vert : couvert.', '; ambre : récent ; bleu acier : sorti ; cyan : couvert.'],
    ],
  },
};
const C = PALETTES[DIRECTION];
if (!C) throw new Error('Direction inconnue : ' + DIRECTION);
const SERIF = C.display;
const SANS = 'Segoe UI';

// ---------- Encodage PBIR ----------
const lit = (v) => ({ expr: { Literal: { Value: v } } });
const str = (s) => lit(`'${String(s).replace(/'/g, "''")}'`);
const num = (n) => lit(`${n}D`);
const int = (n) => lit(`${n}L`);
const bool = (b) => lit(b ? 'true' : 'false');
const color = (hex) => ({ solid: { color: str(hex) } });
const measure = (t, m) => ({ Measure: { Expression: { SourceRef: { Entity: t } }, Property: m } });
const column = (t, c) => ({ Column: { Expression: { SourceRef: { Entity: t } }, Property: c } });
const colorFromMeasure = (t, m) => ({ solid: { color: { expr: measure(t, m) } } });
const proj = (field, t, p) => ({ field, queryRef: `${t}.${p}`, nativeQueryRef: p });
const hexId = (seed, n = 20) => crypto.createHash('sha1').update(seed).digest('hex').slice(0, n);

const yearFilter = (seed, year) => ({
  name: 'Filter' + hexId('filtre' + seed, 24),
  field: column('Année', 'Année'),
  type: 'Categorical',
  filter: {
    Version: 2,
    From: [{ Name: 'a', Entity: 'Année', Type: 0 }],
    Where: [{ Condition: { In: {
      Expressions: [{ Column: { Expression: { SourceRef: { Source: 'a' } }, Property: 'Année' } }],
      Values: [[{ Literal: { Value: `${year}L` } }]],
    } } }],
  },
  howCreated: 'User',
  isHiddenInViewMode: false,
});

// ---------- Grille 12 x 12 sur 1920 x 1080 (marge 32, gouttière 24, accroche 8) ----------
const W = 1920, H = 1080, M = 32, G = 24;
const CW = (W - 2 * M - 11 * G) / 12, RH = (H - 2 * M - 11 * G) / 12;
const snap = (v) => Math.round(v / 8) * 8;
function region([c1, r1, c2, r2]) {
  const x = M + (c1 - 1) * (CW + G), y = M + (r1 - 1) * (RH + G);
  const w = (c2 - c1) * CW + (c2 - c1 - 1) * G, h = (r2 - r1) * RH + (r2 - r1 - 1) * G;
  return { x: snap(x), y: snap(y), width: snap(w), height: snap(h) };
}
function slot(r, i, n, axis = 'x') {
  if (axis === 'x') {
    const w = (r.width - (n - 1) * G) / n;
    return { x: snap(r.x + i * (w + G)), y: r.y, width: snap(w), height: r.height };
  }
  const h = (r.height - (n - 1) * G) / n;
  return { x: r.x, y: snap(r.y + i * (h + G)), width: r.width, height: snap(h) };
}

// ---------- Habillage commun des visuels (signature : titre serif + phrase de lecture) ----------
function container({ title, subtitle, subtitleMeasure, subtitleColorMeasure, alt, card = true }) {
  const vco = {
    padding: [{ properties: { top: num(12), bottom: num(12), left: num(16), right: num(16) } }],
    background: [{ properties: { show: bool(card), color: color(C.card), transparency: num(0) } }],
    border: [{ properties: { show: bool(card), color: color(C.rule), radius: num(6), width: num(1) } }],
    dropShadow: [{ properties: { show: bool(false) } }],
    visualHeader: [{ properties: { show: bool(false) } }],
  };
  if (title) {
    vco.title = [{ properties: {
      show: bool(true), text: str(title), fontFamily: str(SERIF), fontSize: num(15), fontColor: color(C.ink), bold: bool(false),
    } }];
  } else {
    vco.title = [{ properties: { show: bool(false) } }];
  }
  if (subtitle || subtitleMeasure) {
    vco.subTitle = [{ properties: {
      show: bool(true),
      text: subtitleMeasure ? { expr: measure(...subtitleMeasure) } : str(subtitle),
      fontFamily: str(SANS), fontSize: num(subtitleColorMeasure ? 12 : 10),
      fontColor: subtitleColorMeasure ? colorFromMeasure(...subtitleColorMeasure) : color(C.muted),
    } }];
  }
  if (alt) vco.general = [{ properties: { altText: str(alt) } }];
  return vco;
}

function visualFile(page, id, pos, z, visual, filters) {
  const v = { $schema: VISUAL_SCHEMA, name: id, position: { ...pos, z, tabOrder: z }, visual };
  if (filters) v.filterConfig = { filters };
  const dir = path.join(DEF, 'pages', page, 'visuals', id);
  fs.mkdirSync(dir, { recursive: true });
  let json = JSON.stringify(v, null, 2);
  for (const [de, vers] of C.mots || []) json = json.split(de).join(vers);
  fs.writeFileSync(path.join(dir, 'visual.json'), json);
}

// ---------- Fabriques de visuels ----------
function textbox(page, seed, pos, z, runs, align = 'left') {
  const id = hexId(page + seed);
  visualFile(page, id, pos, z, {
    visualType: 'textbox',
    objects: { general: [{ properties: { paragraphs: runs.map((r) => ({
      textRuns: [{ value: r.text, textStyle: { fontFamily: r.font || SANS, fontSize: `${r.size}pt`, color: r.color || C.ink, ...(r.bold ? { fontWeight: 'bold' } : {}) } }],
      horizontalTextAlignment: align,
    })) } }] },
    visualContainerObjects: {
      background: [{ properties: { show: bool(false) } }],
      border: [{ properties: { show: bool(false) } }],
      padding: [{ properties: { top: num(0), bottom: num(0), left: num(0), right: num(0) } }],
    },
  });
}

function kpiCard(page, seed, pos, z, { table, value, label, title, context, contextColor, accent, alt, year }) {
  const id = hexId(page + seed);
  visualFile(page, id, pos, z, {
    visualType: 'cardVisual',
    query: { queryState: { Data: { projections: [proj(measure(table, value), table, value)] } } },
    objects: {
      value: [{ properties: { fontSize: num(30), fontFamily: str(C.value), fontColor: color(C.valueInk), labelDisplayUnits: num(1) }, selector: { id: 'default' } }],
      fillCustom: [{ properties: { show: bool(true), fillColor: color(C.card), transparency: num(0) }, selector: { id: 'default' } }],
      label: [{ properties: { show: bool(true), text: str(label), fontSize: num(11), fontColor: color(C.muted) }, selector: { id: 'default' } }],
      accentBar: [{ properties: { show: bool(true), position: str('Left'), width: num(5), color: color(accent) }, selector: { id: 'default' } }],
      outline: [{ properties: { show: bool(false) }, selector: { id: 'default' } }],
      padding: [{ properties: { paddingUniform: num(8) }, selector: { id: 'default' } }],
      layout: [{ properties: { paddingUniform: num(0) }, selector: { id: 'default' } }],
    },
    visualContainerObjects: {
      ...container({ title, subtitleMeasure: context ? [table, context] : null, subtitleColorMeasure: contextColor ? [table, contextColor] : null, alt }),
      padding: [{ properties: { top: num(8), bottom: num(8), left: num(12), right: num(12) } }],
    },
  }, year ? [yearFilter(page + seed, year)] : null);
}

function measuresProjections(list) {
  return list.map(([t, m]) => proj(measure(t, m), t, m));
}

function seriesColors(list) {
  return list.map(([t, m, hex]) => ({ properties: { fill: color(hex) }, selector: { metadata: `${t}.${m}` } }));
}

function axisCommon(extra = {}) {
  return {
    categoryAxis: [{ properties: {
      show: bool(true), axisType: str('Categorical'), fontFamily: str(SANS), fontSize: num(10),
      labelColor: color(C.muted), showAxisTitle: bool(false), gridlineShow: bool(false), ...extra.categoryAxis,
    } }],
    valueAxis: [{ properties: {
      show: bool(extra.valueAxisShow !== false), fontFamily: str(SANS), fontSize: num(9), labelColor: color(C.muted),
      showAxisTitle: bool(false), gridlineShow: bool(false), ...extra.valueAxis,
    } }],
  };
}

function lineChart(page, seed, pos, z, { category, series, title, subtitle, alt }) {
  const id = hexId(page + seed);
  visualFile(page, id, pos, z, {
    visualType: 'lineChart',
    query: { queryState: {
      Category: { projections: [proj(column(...category), ...category)] },
      Y: { projections: measuresProjections(series) },
    } },
    objects: {
      ...axisCommon(),
      dataPoint: seriesColors(series),
      lineStyles: [
        { properties: { strokeWidth: num(3), lineChartType: str('linear'), showMarker: bool(true), markerSize: num(5) } },
        ...series.filter((s) => s[3] === 'dashed').map(([t, m]) => ({
          properties: { lineStyle: str('dashed'), strokeWidth: num(2), showMarker: bool(false) }, selector: { metadata: `${t}.${m}` },
        })),
      ],
      labels: [{ properties: { show: bool(false) } }],
      legend: [{ properties: { show: bool(true), position: str('Top'), fontFamily: str(SANS), fontSize: num(10), labelColor: color(C.muted), showTitle: bool(false) } }],
    },
    visualContainerObjects: container({ title, subtitle, alt }),
  });
}

function columnChart(page, seed, pos, z, { type = 'columnChart', category, series, colorMeasure, title, subtitle, alt, refLine, sort, year, labelsUnits }) {
  const id = hexId(page + seed);
  const isBar = type === 'barChart';
  const objects = {
    ...axisCommon({ valueAxisShow: false, categoryAxis: isBar ? { axisType: str('Categorical') } : {} }),
    labels: [{ properties: {
      show: bool(true), fontFamily: str(SANS), fontSize: num(10), color: color(C.ink),
      ...(labelsUnits ? { labelDisplayUnits: num(labelsUnits) } : {}),
    } }],
    legend: [{ properties: { show: bool(series.length > 1), position: str('Top'), fontFamily: str(SANS), fontSize: num(10), labelColor: color(C.muted), showTitle: bool(false) } }],
  };
  if (colorMeasure) {
    objects.dataPoint = [{ properties: { fill: colorFromMeasure(...colorMeasure) }, selector: { data: [{ dataViewWildcard: { matchingOption: 1 } }] } }];
  } else {
    objects.dataPoint = seriesColors(series);
  }
  if (refLine) {
    const key = 'y1AxisReferenceLine';
    objects[key] = [{ properties: {
      show: bool(true), displayName: str(refLine.name), value: num(refLine.value), lineColor: color(C.ink),
      width: num(2), style: str('solid'), transparency: num(0), position: str(isBar ? 'back' : 'front'),
      dataLabelShow: bool(!isBar), dataLabelText: str('Name'), dataLabelColor: color(C.ink),
      dataLabelHorizontalPosition: str(isBar ? 'right' : 'left'), dataLabelVerticalPosition: str('above'),
    }, selector: { id: '1' } }];
  }
  const query = { queryState: {
    Category: { projections: [proj(column(...category), ...category)] },
    Y: { projections: measuresProjections(series) },
  } };
  if (sort) {
    query.sortDefinition = { sort: [{ field: measure(series[0][0], series[0][1]), direction: sort }], isDefaultSort: false };
  }
  visualFile(page, id, pos, z, { visualType: type, query, objects, visualContainerObjects: container({ title, subtitle, alt }) },
    year ? [yearFilter(page + seed, year)] : null);
}

function heatmap(page, seed, pos, z, { rows, value, back, fore, title, subtitle, alt }) {
  const id = hexId(page + seed);
  const [t, m] = value;
  const meta = `${t}.${m}`;
  visualFile(page, id, pos, z, {
    visualType: 'pivotTable',
    query: { queryState: {
      Rows: { projections: [proj(column(...rows), ...rows)] },
      Columns: { projections: [proj(column('Année', 'Année'), 'Année', 'Année')] },
      Values: { projections: [proj(measure(t, m), t, m)] },
    } },
    objects: {
      columnHeaders: [{ properties: {
        autoSizeColumnWidth: bool(true), columnAdjustment: str('growToFit'), fontFamily: str(SANS), fontSize: num(10),
        fontColor: color(C.muted), backColor: color(C.card), bold: bool(true), alignment: str('Center'),
      } }],
      rowHeaders: [{ properties: { fontFamily: str(SANS), fontSize: num(10), fontColor: color(C.ink), backColor: color(C.card) } }],
      values: [
        { properties: { fontFamily: str(SANS), fontSize: num(10), backColorPrimary: color(C.card), backColorSecondary: color(C.card) } },
        { properties: { backColor: colorFromMeasure(...back), fontColor: colorFromMeasure(...fore) },
          selector: { data: [{ dataViewWildcard: { matchingOption: 1 } }], metadata: meta } },
      ],
      grid: [{ properties: {
        gridVertical: bool(true), gridVerticalColor: color(C.card), gridVerticalWeight: num(2),
        gridHorizontal: bool(true), gridHorizontalColor: color(C.card), gridHorizontalWeight: num(2),
        rowPadding: num(2), outlineColor: color(C.card),
      } }],
      subTotals: [{ properties: { rowSubtotals: bool(false), columnSubtotals: bool(false) } }],
    },
    visualContainerObjects: {
      ...container({ title, subtitle, alt }),
      stylePreset: [{ properties: { name: str('None') } }],
    },
  });
}

function slicer(page, seed, pos, z, { field, header }) {
  const id = hexId(page + seed);
  visualFile(page, id, pos, z, {
    visualType: 'slicer',
    query: { queryState: { Values: { projections: [proj(column(...field), ...field)] } } },
    objects: {
      data: [{ properties: { mode: str('Dropdown') } }],
      header: [{ properties: { show: bool(true), text: str(header), fontFamily: str(SANS), textSize: num(10), fontColor: color(C.muted) } }],
      items: [{ properties: { fontFamily: str(SANS), textSize: num(11), fontColor: color(C.ink), background: color(C.card) } }],
    },
    visualContainerObjects: {
      padding: [{ properties: { top: num(8), bottom: num(8), left: num(8), right: num(8) } }],
      background: [{ properties: { show: bool(true), color: color(C.card), transparency: num(0) } }],
      border: [{ properties: { show: bool(true), color: color(C.rule), radius: num(6), width: num(1) } }],
      visualHeader: [{ properties: { show: bool(false) } }],
    },
  });
}

function navigator(page, pos, z) {
  const id = hexId(page + 'nav');
  visualFile(page, id, pos, z, {
    visualType: 'pageNavigator',
    objects: {
      fill: [
        { properties: { show: bool(true), fillColor: color(C.navFill), transparency: num(0) }, selector: { id: 'default' } },
        { properties: { fillColor: color(C.navSel) }, selector: { id: 'selected' } },
      ],
      text: [
        { properties: { fontFamily: str(SANS), fontSize: num(11), fontColor: color(C.navText) }, selector: { id: 'default' } },
        { properties: { fontColor: color(C.navSelText) }, selector: { id: 'selected' } },
      ],
      outline: [{ properties: { show: bool(false) }, selector: { id: 'default' } }],
    },
    visualContainerObjects: {
      background: [{ properties: { show: bool(false) } }],
      border: [{ properties: { show: bool(false) } }],
      padding: [{ properties: { top: num(0), bottom: num(0), left: num(0), right: num(0) } }],
      visualHeader: [{ properties: { show: bool(false) } }],
    },
  });
}

// Bandeau vert profond en tête de page (identité de la direction A, version 2)
function band(page) {
  const id = hexId(page + 'band');
  visualFile(page, id, { x: 0, y: 0, width: W, height: 104 }, 10, {
    visualType: 'shape',
    objects: {
      shape: [{ properties: { tileShape: str('rectangle') }, selector: { id: 'default' } }],
      fill: [{ properties: { show: bool(true), fillColor: color(C.band), transparency: num(0) }, selector: { id: 'default' } }],
      outline: [{ properties: { show: bool(false) } }],
    },
    visualContainerObjects: {
      background: [{ properties: { show: bool(false) } }],
      border: [{ properties: { show: bool(false) } }],
      padding: [{ properties: { top: num(0), bottom: num(0), left: num(0), right: num(0) } }],
      visualHeader: [{ properties: { show: bool(false) } }],
    },
  });
}

// Titre dynamique : une carte qui affiche une mesure texte, sans étiquette ni cadre
function titleCard(page, seed, pos, z, { table, measureName }) {
  const id = hexId(page + seed);
  visualFile(page, id, pos, z, {
    visualType: 'cardVisual',
    query: { queryState: { Data: { projections: [proj(measure(table, measureName), table, measureName)] } } },
    objects: {
      value: [{ properties: { fontSize: num(24), fontFamily: str(SERIF), fontColor: color(C.onBand), horizontalAlignment: str('left'), textWrap: bool(true) }, selector: { id: 'default' } }],
      label: [{ properties: { show: bool(false) }, selector: { id: 'default' } }],
      outline: [{ properties: { show: bool(false) }, selector: { id: 'default' } }],
      fillCustom: [{ properties: { show: bool(true), fillColor: color(C.band), transparency: num(0) }, selector: { id: 'default' } }],
      padding: [{ properties: { paddingUniform: num(0) }, selector: { id: 'default' } }],
      layout: [{ properties: { paddingUniform: num(0) }, selector: { id: 'default' } }],
    },
    visualContainerObjects: {
      background: [{ properties: { show: bool(false) } }],
      border: [{ properties: { show: bool(false) } }],
      title: [{ properties: { show: bool(false) } }],
      padding: [{ properties: { top: num(0), bottom: num(0), left: num(0), right: num(0) } }],
      visualHeader: [{ properties: { show: bool(false) } }],
    },
  });
  return id;
}

// Sélecteur d'année en tuiles, une seule campagne à la fois, 2024 présélectionnée
function yearTiles(page, seed, pos, z, year) {
  const id = hexId(page + seed);
  visualFile(page, id, pos, z, {
    visualType: 'advancedSlicerVisual',
    query: { queryState: { Values: { projections: [proj(column('Année', 'Année'), 'Année', 'Année')] } } },
    objects: {
      general: [{ properties: { filter: { filter: {
        Version: 2,
        From: [{ Name: 'a', Entity: 'Année', Type: 0 }],
        Where: [{ Condition: { In: {
          Expressions: [{ Column: { Expression: { SourceRef: { Source: 'a' } }, Property: 'Année' } }],
          Values: [[{ Literal: { Value: `${year}L` } }]],
        } } }],
      } } } }],
      selection: [{ properties: { singleSelect: bool(true), strictSingleSelect: bool(true), selectAllCheckboxEnabled: bool(false) } }],
      layout: [{ properties: { rowCount: int(1), columnCount: int(10), cellPadding: int(6) } }],
      value: [{ properties: { fontFamily: str(SANS), fontSize: num(12), fontColor: color(C.ink) } }],
      label: [{ properties: { show: bool(false) }, selector: { id: 'default' } }],
      fillCustom: [
        { properties: { show: bool(true), fillColor: color(C.card), transparency: num(0) }, selector: { id: 'default' } },
        { properties: { fillColor: color(C.tileSel) }, selector: { id: 'selected' } },
      ],
      outline: [
        { properties: { show: bool(true), lineColor: color(C.rule), weight: num(1) }, selector: { id: 'default' } },
        { properties: { show: bool(true), lineColor: color(C.mil), weight: num(3) }, selector: { id: 'selected' } },
      ],
    },
    visualContainerObjects: {
      background: [{ properties: { show: bool(false) } }],
      border: [{ properties: { show: bool(false) } }],
      title: [{ properties: { show: bool(false) } }],
      padding: [{ properties: { top: num(0), bottom: num(0), left: num(0), right: num(0) } }],
      visualHeader: [{ properties: { show: bool(false) } }],
    },
  });
  return id;
}

// Mini-courbe 2015-2024 posée dans le bas d'une carte KPI, avec sa ligne de seuil
function sparkline(page, seed, pos, z, { table, value, threshold, alt }) {
  const id = hexId(page + seed);
  const objects = {
    categoryAxis: [{ properties: { show: bool(false), axisType: str('Categorical') } }],
    valueAxis: [{ properties: { show: bool(false), gridlineShow: bool(false) } }],
    dataPoint: [{ properties: { fill: color(C.mil) }, selector: { metadata: `${table}.${value}` } }],
    lineStyles: [{ properties: { strokeWidth: num(2), lineChartType: str('linear'), showMarker: bool(false) } }],
    labels: [{ properties: { show: bool(false) } }],
    legend: [{ properties: { show: bool(false) } }],
  };
  if (threshold !== undefined) {
    objects.y1AxisReferenceLine = [{ properties: {
      show: bool(true), value: num(threshold), lineColor: color(C.ink), width: num(1), style: str('dashed'),
      transparency: num(40), position: str('back'), dataLabelShow: bool(false),
    }, selector: { id: '1' } }];
  }
  visualFile(page, id, pos, z, {
    visualType: 'lineChart',
    query: { queryState: {
      Category: { projections: [proj(column('Année', 'Année'), 'Année', 'Année')] },
      Y: { projections: [proj(measure(table, value), table, value)] },
    } },
    objects,
    visualContainerObjects: {
      background: [{ properties: { show: bool(false) } }],
      border: [{ properties: { show: bool(false) } }],
      title: [{ properties: { show: bool(false) } }],
      padding: [{ properties: { top: num(0), bottom: num(0), left: num(0), right: num(0) } }],
      visualHeader: [{ properties: { show: bool(false) } }],
      general: [{ properties: { altText: str(alt) } }],
    },
  });
  return id;
}

function waterfall(page, seed, pos, z, { title, subtitle, alt }) {
  const id = hexId(page + seed);
  const t = 'Étape du bilan';
  visualFile(page, id, pos, z, {
    visualType: 'waterfallChart',
    query: {
      queryState: {
        Category: { projections: [proj(column(t, 'Étape'), t, 'Étape')] },
        Y: { projections: [proj(measure(BILAN, 'Montant étape du bilan'), BILAN, 'Montant étape du bilan')] },
      },
      sortDefinition: { sort: [{ field: column(t, 'Étape'), direction: 'Ascending' }], isDefaultSort: false },
    },
    objects: {
      sentimentColors: [{ properties: { increaseFill: color(C.mil), decreaseFill: color(C.ocre), totalFill: color(C.total) } }],
      categoryAxis: [{ properties: { show: bool(true), fontFamily: str(SANS), fontSize: num(10), labelColor: color(C.muted), showAxisTitle: bool(false) } }],
      valueAxis: [{ properties: { show: bool(false), gridlineShow: bool(false), totalsEnabled: bool(true) } }],
      labels: [{ properties: { show: bool(true), fontFamily: str(SANS), fontSize: num(11), color: color(C.ink), labelDisplayUnits: num(1) } }],
      legend: [{ properties: { show: bool(false) } }],
    },
    visualContainerObjects: container({ title, subtitle, alt }),
  });
  return id;
}

function combo(page, seed, pos, z, { title, subtitle, alt }) {
  const id = hexId(page + seed);
  visualFile(page, id, pos, z, {
    visualType: 'lineClusteredColumnComboChart',
    query: { queryState: {
      Category: { projections: [proj(column('Année', 'Année'), 'Année', 'Année')] },
      Y: { projections: [proj(measure(BILAN, 'Importations et aides'), BILAN, 'Importations et aides')] },
      Y2: { projections: [proj(measure(BILAN, 'Part des importations'), BILAN, 'Part des importations')] },
    } },
    objects: {
      categoryAxis: [{ properties: { show: bool(true), axisType: str('Categorical'), fontFamily: str(SANS), fontSize: num(10), labelColor: color(C.muted), showAxisTitle: bool(false) } }],
      valueAxis: [{ properties: { show: bool(false), gridlineShow: bool(false), secShow: bool(true), secStart: num(0.08), secEnd: num(0.18), secLabelColor: color(C.muted), secFontFamily: str(SANS), secFontSize: num(9), secShowAxisTitle: bool(false) } }],
      dataPoint: [
        { properties: { defaultColor: color(C.import) } },
        { properties: { fill: color(C.import) }, selector: { metadata: `${BILAN}.Importations et aides` } },
        { properties: { fill: color(C.ink) }, selector: { metadata: `${BILAN}.Part des importations` } },
      ],
      lineStyles: [{ properties: { strokeWidth: num(2), showMarker: bool(true), markerSize: num(5) } }],
      labels: [{ properties: { show: bool(true), fontFamily: str(SANS), fontSize: num(9), color: color(C.ink) } }],
      legend: [{ properties: { show: bool(true), position: str('Top'), fontFamily: str(SANS), fontSize: num(10), labelColor: color(C.muted), showTitle: bool(false) } }],
    },
    visualContainerObjects: container({ title, subtitle, alt }),
  });
  return id;
}

function scatter(page, seed, pos, z, { title, subtitle, alt }) {
  const id = hexId(page + seed);
  const P = PROV;
  visualFile(page, id, pos, z, {
    visualType: 'scatterChart',
    query: { queryState: {
      Category: { projections: [proj(column(P, 'Province'), P, 'Province')] },
      X: { projections: [proj(measure(P, 'Campagnes sous 100 %'), P, 'Campagnes sous 100 %')] },
      Y: { projections: [proj(measure(P, 'Taux de couverture provincial 2024'), P, 'Taux de couverture provincial 2024')] },
      Tooltips: { projections: [proj(measure(P, 'Profil de déficit'), P, 'Profil de déficit')] },
    } },
    objects: {
      dataPoint: [{ properties: { fill: colorFromMeasure(P, 'Couleur profil de déficit') }, selector: { data: [{ dataViewWildcard: { matchingOption: 1 } }] } }],
      categoryLabels: [{ properties: { show: bool(true), fontFamily: str(SANS), fontSize: num(9), color: color(C.ink) } }],
      categoryAxis: [{ properties: {
        show: bool(true), start: num(-0.5), end: num(10.5), fontFamily: str(SANS), fontSize: num(10), labelColor: color(C.muted),
        showAxisTitle: bool(true), titleText: str('Campagnes sous 100 % des besoins (2015-2024)'), titleFontFamily: str(SANS), titleColor: color(C.muted), gridlineShow: bool(false),
      } }],
      valueAxis: [{ properties: {
        show: bool(true), start: num(0), fontFamily: str(SANS), fontSize: num(10), labelColor: color(C.muted),
        showAxisTitle: bool(true), titleText: str('Taux de couverture 2024'), titleFontFamily: str(SANS), titleColor: color(C.muted), gridlineShow: bool(false),
      } }],
      xAxisReferenceLine: [{ properties: {
        show: bool(true), displayName: str('Chronique'), value: num(4.5), lineColor: color(C.muted), width: num(1), style: str('dashed'),
        position: str('back'), dataLabelShow: bool(false),
      }, selector: { id: '1' } }],
      y1AxisReferenceLine: [{ properties: {
        show: bool(true), displayName: str('Seuil 100 %'), value: num(1), lineColor: color(C.ink), width: num(2), style: str('solid'),
        position: str('back'), dataLabelShow: bool(true), dataLabelText: str('Name'), dataLabelColor: color(C.ink),
        dataLabelHorizontalPosition: str('right'), dataLabelVerticalPosition: str('above'),
      }, selector: { id: '1' } }],
      bubbles: [{ properties: { bubbleSize: num(4) } }],
      legend: [{ properties: { show: bool(false) } }],
    },
    visualContainerObjects: container({ title, subtitle, alt }),
  });
  return id;
}

function pageJson(name, displayName, interactions = []) {
  const dir = path.join(DEF, 'pages', name);
  fs.rmSync(path.join(dir, 'visuals'), { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'page.json'), JSON.stringify({
    $schema: PAGE_SCHEMA, name, displayName, displayOption: 'FitToPage', height: H, width: W,
    ...(interactions.length ? { visualInteractions: interactions } : {}),
    objects: {
      background: [{ properties: { color: color(C.page), transparency: num(0) } }],
      outspace: [{ properties: { color: color(C.page), transparency: num(0) } }],
      outspacePane: [{ properties: {
        backgroundColor: color(C.card), foregroundColor: color(C.ink), borderColor: color(C.rule), border: bool(true),
        checkboxAndApplyColor: color(C.mil), inputBoxColor: color(C.card), fontFamily: str(SANS),
      } }],
    },
  }, null, 2));
}

// ---------- Thème ----------
function writeTheme() {
  const regDir = path.join(REPORT, 'StaticResources', 'RegisteredResources');
  fs.mkdirSync(regDir, { recursive: true });
  for (const f of fs.readdirSync(regDir)) if (/^(SaisonDesRecoltes|SalleDeVeille)-/.test(f)) fs.rmSync(path.join(regDir, f));
  const name = `${C.theme}-${crypto.randomBytes(4).toString('hex')}.json`;
  const theme = {
    $schema: 'https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.153.json',
    name,
    dataColors: [C.mil, C.ocre, C.besoins, C.import, C.aide, C.export, '#8E3B12', '#B9D3B4'],
    good: C.mil, neutral: '#C9A66B', bad: C.ocre,
    maximum: C.mil, center: C.applied, minimum: C.ocre, null: C.muted,
    foreground: C.ink, foregroundNeutralSecondary: C.muted, backgroundLight: C.rule, foregroundNeutralTertiary: C.muted,
    background: C.card, backgroundNeutral: C.applied, tableAccent: C.mil,
    textClasses: {
      callout: { fontSize: 30, fontFace: SERIF, color: C.ink },
      title: { fontSize: 14, fontFace: SERIF, color: C.ink },
      header: { fontSize: 12, fontFace: 'Segoe UI Semibold', color: C.ink },
      label: { fontSize: 10, fontFace: SANS, color: C.ink },
    },
    visualStyles: {
      '*': { '*': {
        background: [{ show: true, color: { solid: { color: C.card } }, transparency: 0 }],
        border: [{ show: true, color: { solid: { color: C.rule } }, radius: 6 }],
        dropShadow: [{ show: false }],
        visualHeader: [{ show: false }],
        padding: [{ top: 12, bottom: 12, left: 16, right: 16 }],
      } },
      textbox: { '*': {
        padding: [{ top: 0, bottom: 0, left: 0, right: 0 }],
        background: [{ show: false }],
        border: [{ show: false }],
      } },
      pivotTable: { '*': {
        columnHeaders: [{ autoSizeColumnWidth: true, columnAdjustment: 'growToFit' }],
      } },
    },
  };
  fs.writeFileSync(path.join(regDir, name), JSON.stringify(theme, null, 2));

  const reportPath = path.join(DEF, 'report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  report.themeCollection.customTheme = {
    name, reportVersionAtImport: report.themeCollection.baseTheme.reportVersionAtImport, type: 'RegisteredResources',
  };
  report.resourcePackages = report.resourcePackages.filter((p) => p.name !== 'RegisteredResources');
  report.resourcePackages.push({ name: 'RegisteredResources', type: 'RegisteredResources', items: [{ name, path: name, type: 'CustomTheme' }] });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return name;
}

// ---------- Pages ----------
const BILAN = 'Bilan céréalier', REG = 'Couverture régionale', PROV = 'Couverture provinciale';
const pagesMeta = JSON.parse(fs.readFileSync(path.join(DEF, 'pages', 'pages.json'), 'utf8'));
const P1 = pagesMeta.pageOrder[0];
const P2 = hexId('page-regions'), P3 = hexId('page-provinces');

function titleBlock(page, r, title, kicker) {
  band(page);
  textbox(page, 'kicker', { x: r.x, y: 20, width: r.width, height: 24 }, 1000, [{ text: kicker, size: 10, color: C.kicker, font: SANS }]);
  if (title) textbox(page, 'title', { x: r.x, y: 44, width: r.width, height: 48 }, 1001, [{ text: title, size: 22, font: SERIF, color: C.onBand }]);
}

function page1() {
  const ids = {
    tiles: hexId(P1 + 'annees'), combo: hexId(P1 + 'combo'),
    sparks: [0, 1, 2, 3, 4].map((i) => hexId(P1 + 'spark' + i)),
  };
  pageJson(P1, 'Campagne', [ids.combo, ...ids.sparks].map((t) => ({ source: ids.tiles, target: t, type: 'NoFilter' })));
  titleBlock(P1, { x: M, width: 1300 }, null, 'BILAN CÉRÉALIER DU BURKINA FASO · CAMPAGNES 2015 À 2024');
  titleCard(P1, 'titre', { x: M, y: 40, width: 1320, height: 56 }, 1001, { table: BILAN, measureName: 'Titre page campagne' });
  navigator(P1, { x: 1400, y: 28, width: 488, height: 48 }, 1002);
  yearTiles(P1, 'annees', { x: M, y: 120, width: 1104, height: 56 }, 1003, 2024);
  textbox(P1, 'aide', { x: 1160, y: 136, width: 728, height: 28 }, 1004, [{
    text: 'Choisissez une campagne : le titre, les cartes et la cascade se recalculent. Les courbes montrent toute la série.',
    size: 10, color: C.muted,
  }]);
  const kpis = [
    { value: 'Production brute', label: 'milliers de tonnes', title: 'Production brute', context: 'Contexte production', contextColor: 'Couleur contexte production', accent: C.mil,
      alt: 'Production céréalière brute de la campagne choisie, en milliers de tonnes, et son évolution sur un an.' },
    { value: 'Taux de couverture', label: 'des besoins céréaliers', title: 'Couverture des besoins', context: 'Contexte couverture', contextColor: 'Couleur contexte couverture', accent: C.mil,
      threshold: 1, alt: 'Taux de couverture des besoins céréaliers de la campagne choisie, comparé au seuil de 100 %.' },
    { value: 'Excédent brut', label: 'milliers de tonnes, avant importations', title: 'Solde brut', context: 'Contexte excédent', contextColor: 'Couleur excédent', accent: C.mil,
      threshold: 0, alt: 'Solde brut de la campagne choisie : disponibilités moins besoins, avant échanges extérieurs.' },
    { value: 'Part des importations', label: 'des ressources totales', title: 'Part importée', context: 'Contexte importations', contextColor: 'Couleur contexte importations', accent: C.import,
      alt: 'Part des importations commerciales et des aides dans les ressources céréalières de la campagne choisie.' },
    { value: 'Disponible par habitant', label: 'par habitant et par an', title: 'Céréales par habitant', context: 'Contexte par habitant', contextColor: 'Couleur contexte par habitant', accent: C.mil,
      threshold: 190, alt: 'Céréales disponibles par habitant pour la campagne choisie, comparées à la norme de 190 kg.' },
  ];
  const cardW = (W - 2 * M - 4 * G) / 5;
  kpis.forEach((k, i) => {
    const pos = { x: snap(M + i * (cardW + G)), y: 192, width: snap(cardW), height: 248 };
    kpiCard(P1, 'kpi' + i, pos, 2000 + i, { table: BILAN, ...k });
    sparkline(P1, 'spark' + i, { x: pos.x + 16, y: pos.y + 176, width: pos.width - 32, height: 64 }, 2100 + i, {
      table: BILAN, value: k.value, threshold: k.threshold,
      alt: 'Tendance 2015-2024 : ' + k.title.toLowerCase() + '.',
    });
  });
  waterfall(P1, 'cascade', { x: M, y: 464, width: 1080, height: 544 }, 3000, {
    title: "D'où vient le solde de la campagne ?",
    subtitle: 'Cascade du bilan, milliers de tonnes : ressources en vert, emplois en ocre ; la dernière colonne est le solde net, après échanges extérieurs.',
    alt: "Cascade du bilan céréalier de la campagne choisie : production disponible et stocks initiaux, moins consommation humaine et stocks finaux, plus importations et aides, moins exportations, jusqu'au solde net.",
  });
  combo(P1, 'combo', { x: 1136, y: 464, width: 752, height: 544 }, 3001, {
    title: 'Importations et dépendance',
    subtitle: "Colonnes : importations commerciales et aides (milliers de tonnes). Ligne : part des ressources venue de l'extérieur.",
    alt: 'Graphique combiné 2015-2024 : volume des importations et des aides en colonnes, part importée en ligne, entre 13 et 17 %.',
  });
  textbox(P1, 'source', { x: M, y: 1024, width: 1856, height: 24 }, 4000, [{
    text: 'Source : Annuaire des statistiques agro-pastorales et halieutiques 2024, MARAH/DGESS (tableaux 076.1 et 076.3 ; MAAH/CPSA et EPA). Quantités en milliers de tonnes.',
    size: 9, color: C.muted,
  }]);
}

function page2() {
  pageJson(P2, 'Régions');
  const R = {
    header: region([1, 1, 9, 2]), nav: region([9, 1, 13, 2]), hero: region([1, 2, 9, 7]),
    counts: region([9, 2, 13, 7]), detail: region([1, 7, 13, 12]), footer: region([1, 12, 13, 13]),
  };
  titleBlock(P2, R.header, '5 régions sur 13 ne couvrent pas leurs besoins céréaliers en 2024',
    'TAUX DE COUVERTURE DES BESOINS CÉRÉALIERS PAR RÉGION');
  navigator(P2, { ...R.nav, y: 28, height: 48 }, 1002);
  columnChart(P2, 'regions', R.hero, 3000, {
    type: 'barChart', category: ['Région', 'Région'], series: [[REG, 'Taux de couverture régional']],
    colorMeasure: [REG, 'Couleur barre couverture régionale'], refLine: { name: 'Seuil 100 %', value: 1 }, sort: 'Descending', year: 2024,
    title: 'Taux de couverture par région, campagne 2024',
    subtitle: 'Production disponible rapportée aux besoins. Ocre : région déficitaire ; trait noir : seuil de 100 %.',
    alt: 'Barres classées du taux de couverture des besoins céréaliers par région en 2024 ; Centre, Centre-Nord, Sahel, Nord et Plateau-Central sont sous 100 %.',
  });
  kpiCard(P2, 'nbreg', slot(R.counts, 0, 2, 'y'), 2000, {
    table: REG, value: 'Régions déficitaires', label: 'régions sur 13', title: 'Régions déficitaires en 2024', accent: C.ocre, year: 2024,
    alt: 'Nombre de régions dont le taux de couverture est inférieur à 100 % en 2024.',
  });
  kpiCard(P2, 'nbprov', slot(R.counts, 1, 2, 'y'), 2001, {
    table: PROV, value: 'Provinces déficitaires', label: 'provinces sur 45', title: 'Provinces déficitaires en 2024', accent: C.ocre, year: 2024,
    alt: 'Nombre de provinces dont le taux de couverture est inférieur à 100 % en 2024.',
  });
  heatmap(P2, 'heat', { ...R.detail, height: R.detail.height + 48 }, 3001, {
    rows: ['Région', 'Région'], value: [REG, 'Taux de couverture régional'],
    back: [REG, 'Couleur fond couverture régionale'], fore: [REG, 'Couleur texte couverture régionale'],
    title: 'Couverture des besoins par région et par campagne',
    subtitle: 'Ocre foncé : moins de 50 % ; ocre : 50 à 79 % ; sable : 80 à 99 % ; vert clair : 100 à 149 % ; vert : 150 % et plus.',
    alt: 'Carte thermique du taux de couverture par région de 2015 à 2024 ; le Centre reste sous 15 % chaque année, le Centre-Nord et le Sahel sont déficitaires la plupart des années.',
  });
  textbox(P2, 'source', { ...R.footer, y: R.footer.y + 64, height: 24 }, 4000, [{
    text: 'Source : tableau 076.3 de l\'annuaire 2024 (EPA 2015-2024). Moyenne simple quand plusieurs années ou régions sont combinées. Le Centre (Kadiogo) est la région de Ouagadougou, surtout urbaine.',
    size: 9, color: C.muted,
  }]);
}

function page3() {
  pageJson(P3, 'Provinces');
  const R = {
    header: region([1, 1, 7, 2]), nav: region([7, 1, 10, 2]), filters: region([10, 1, 13, 2]),
    hero: region([1, 2, 6, 12]), detail: region([6, 2, 13, 12]), footer: region([1, 12, 13, 13]),
  };
  titleBlock(P3, R.header, 'Les provinces, où se loge le déficit', 'TAUX DE COUVERTURE DES BESOINS CÉRÉALIERS PAR PROVINCE');
  navigator(P3, { ...R.nav, y: 28, height: 48 }, 1002);
  slicer(P3, 'region', { ...R.filters, y: 12, height: 80 }, 1003, { field: ['Région', 'Région'], header: 'Région' });
  scatter(P3, 'profil', region([1, 2, 7, 12]), 3000, {
    title: 'Déficit chronique ou récent ?',
    subtitle: 'Brun : déficit chronique (5 campagnes ou plus sous 100 %, encore en 2024) ; ocre : récent ; vert gris : sorti ; vert : couvert.',
    alt: 'Nuage de points des provinces : en abscisse le nombre de campagnes sous 100 % des besoins entre 2015 et 2024, en ordonnée le taux de couverture 2024.',
  });
  heatmap(P3, 'heat', region([7, 2, 13, 12]), 3001, {
    rows: [PROV, 'Province'], value: [PROV, 'Taux de couverture provincial'],
    back: [PROV, 'Couleur fond couverture provinciale'], fore: [PROV, 'Couleur texte couverture provinciale'],
    title: 'Taux de couverture par province et par campagne',
    subtitle: 'Mêmes classes de couleur que la page Régions. Choisissez une région en haut à droite pour zoomer.',
    alt: 'Carte thermique du taux de couverture par province de 2015 à 2024.',
  });
  textbox(P3, 'source', { ...R.footer, y: R.footer.y + 16, height: 32 }, 4000, [{
    text: 'Source : tableau 076.3 de l\'annuaire 2024 (EPA 2015-2024). Moyenne simple quand plusieurs années sont combinées.',
    size: 9, color: C.muted,
  }]);
}

// Desktop retire les $schema de ces deux fichiers à l'enregistrement : on les remet pour la validation
function restoreSchemas() {
  const pbip = path.join(REPORT, '..', 'Bilan cerealier Burkina.pbip');
  const pbir = path.join(REPORT, 'definition.pbir');
  const a = JSON.parse(fs.readFileSync(pbip, 'utf8'));
  const b = JSON.parse(fs.readFileSync(pbir, 'utf8'));
  fs.writeFileSync(pbip, JSON.stringify({ $schema: 'https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json', ...a }, null, 2));
  fs.writeFileSync(pbir, JSON.stringify({ $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json', ...b }, null, 2));
}

restoreSchemas();
const themeName = writeTheme();
page1();
page2();
page3();
pagesMeta.pageOrder = [P1, P2, P3];
pagesMeta.activePageName = P1;
fs.writeFileSync(path.join(DEF, 'pages', 'pages.json'), JSON.stringify(pagesMeta, null, 2));
console.log(JSON.stringify({ theme: themeName, pages: { campagne: P1, regions: P2, provinces: P3 } }));
