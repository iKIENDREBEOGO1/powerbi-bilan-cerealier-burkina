"""Extrait le bilan céréalier (tableau 076.1) et le taux de couverture par région (076.3)
de l'annuaire agro-sylvo-pastoral 2024, contrôle les identités comptables et écrit les CSV."""
import csv, re, sys
from pathlib import Path
import os
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')
# Chemin du PDF de l'annuaire 2024 (MARAH/DGESS) : variable d'environnement ANNUAIRE_PDF,
# sinon le fichier placé dans le dossier courant.
PDF = os.environ.get('ANNUAIRE_PDF', 'Annuaire_agro-sylvo-pastorale_2024.pdf')
OUT = Path(__file__).resolve().parent.parent / 'donnees'
YEARS = list(range(2015, 2025))
doc = pymupdf.open(PDF)


def colonnes(words):
    """Centres x des colonnes années (ligne d'en-tête contenant les 10 années)."""
    by_y = {}
    for w in words:
        if re.fullmatch(r'20(1[5-9]|2[0-4])', w[4]):
            by_y.setdefault(round(w[1]), []).append(w)
    for y, toks in sorted(by_y.items()):
        if len({t[4] for t in toks}) == 10:
            return y, {int(t[4]): (t[0] + t[2]) / 2 for t in toks}
    raise ValueError('en-tête introuvable')


def lignes_valeurs(page, xmin):
    words = doc[page - 1].get_text('words')
    hy, cent = colonnes(words)
    data = [w for w in words if w[1] > hy + 5 and w[0] >= xmin and re.fullmatch(r'-?[\d\u202f ]+', w[4])]
    groupes = []
    for w in sorted(data, key=lambda w: ((w[1] + w[3]) / 2, w[0])):
        yc = (w[1] + w[3]) / 2
        if groupes and abs(groupes[-1][0] - yc) < 3.5:
            groupes[-1][1].append(w)
        else:
            groupes.append([yc, [w]])
    res = []
    for yc, toks in groupes:
        cells = {y: '' for y in YEARS}
        for t in sorted(toks, key=lambda t: t[0]):
            cx = (t[0] + t[2]) / 2
            y = min(YEARS, key=lambda yy: abs(cent[yy] - cx))
            cells[y] += re.sub(r'[\s\u202f]', '', t[4])
        row = {y: (int(v) if v not in ('', '-') else None) for y, v in cells.items()}
        if sum(v is not None for v in row.values()) >= 8:  # écarte le numéro de page
            res.append((yc, row))
    return res

# ---------- Tableau 076.1 : bilan céréalier définitif (page 57 de l'annuaire) ----------
POSTES = [
    ('population_milliers', 'Population au 30/04 (milliers)'),
    ('disponibilites', '1. Disponibilités'),
    ('production_brute', 'Production brute'),
    ('production_disponible', 'Production disponible'),
    ('stocks_initiaux', 'Stocks initiaux au 1/11'),
    ('stocks_initiaux_paysans', 'dont stocks paysans'),
    ('stocks_initiaux_autres', 'dont autres stocks'),
    ('besoins', '2. Besoins'),
    ('norme_kg_hbt', 'Norme de consommation (kg/hbt/an)'),
    ('consommation_humaine', 'Consommation humaine'),
    ('stocks_finaux', 'Stocks finaux au 31/10'),
    ('stocks_finaux_paysans', 'dont stocks paysans'),
    ('stocks_finaux_autres', 'dont autres stocks'),
    ('excedent_brut', '3. Excédent (+) / Déficit (-) brut'),
    ('solde_import_export', '4. Solde import/export'),
    ('importations_commerciales', 'Importations commerciales'),
    ('importations_commercants', 'dont commerçants privés'),
    ('importations_autres', 'dont autres importations'),
    ('aides_alimentaires', 'Aides alimentaires'),
    ('exportations', 'Exportations prévues'),
    ('excedent_net', '5. Excédent (+) / Déficit (-) net'),
    ('disponible_apparent_kg_hbt', '6. Disponible apparent (kg/hbt)'),
]
vals = lignes_valeurs(53, 165)
assert len(vals) == len(POSTES), f'{len(vals)} lignes lues pour {len(POSTES)} postes'
bilan = {code: v for (code, _), (_, v) in zip(POSTES, vals)}
corrections = []

# Cellules mal lues ou erronées dans le PDF, reconstruites par les identités du bilan.
# 2016 : production brute et disponible illisibles (« 9 », « 24 ») -> valeurs du tableau 076.2 (même année).
if bilan['production_brute'][2016] < 1000:
    bilan['production_brute'][2016] = 4567
    corrections.append('2016 production brute : « 9 » dans le PDF, remplacée par 4 567 (tableau 076.2)')
if bilan['production_disponible'][2016] < 1000:
    bilan['production_disponible'][2016] = bilan['disponibilites'][2016] - bilan['stocks_initiaux'][2016]
    corrections.append(f"2016 production disponible : « 24 » dans le PDF, recalculée = disponibilités - stocks initiaux = {bilan['production_disponible'][2016]}")
if bilan['norme_kg_hbt'][2021] == 0:
    bilan['norme_kg_hbt'][2021] = 190
    corrections.append('2021 norme de consommation : « 0 » dans le PDF, remplacée par 190 (consommation humaine / population = 190 kg)')

# Contrôles comptables (tolérance 3 milliers de tonnes pour les arrondis)
ecarts = []
for y in YEARS:
    b = {k: v[y] for k, v in bilan.items()}
    checks = {
        'disponibilites = prod. disponible + stocks initiaux': (b['disponibilites'], b['production_disponible'] + b['stocks_initiaux']),
        'besoins = consommation + stocks finaux': (b['besoins'], b['consommation_humaine'] + b['stocks_finaux']),
        'excédent brut = disponibilités - besoins': (b['excedent_brut'], b['disponibilites'] - b['besoins']),
        'excédent net = brut + solde import/export': (b['excedent_net'], b['excedent_brut'] + b['solde_import_export']),
        'solde = importations + aides - exportations': (b['solde_import_export'], b['importations_commerciales'] + b['aides_alimentaires'] - b['exportations']),
    }
    for nom, (lu, calc) in checks.items():
        if abs(lu - calc) > 3:
            ecarts.append(f'{y} : {nom} -> lu {lu}, calculé {calc}')

with open(OUT / 'bilan_cerealier_2015_2024.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['annee', 'code_poste', 'poste', 'ordre', 'valeur', 'unite'])
    for i, (code, lib) in enumerate(POSTES, 1):
        unite = 'milliers' if code == 'population_milliers' else ('kg/hbt' if 'kg' in code else 'milliers de tonnes')
        for y in YEARS:
            w.writerow([y, code, lib, i, bilan[code][y], unite])

# ---------- Tableau 076.3 : taux de couverture des besoins par région ----------
REG = {'BOUCLE DU MOUHOUN': 'Boucle du Mouhoun', 'CASCADES': 'Cascades', 'CENTRE': 'Centre', 'CENTRE EST': 'Centre-Est',
       'CENTRE NORD': 'Centre-Nord', 'CENTRE OUEST': 'Centre-Ouest', 'CENTRE SUD': 'Centre-Sud', 'EST': 'Est',
       'HAUTS BASSINS': 'Hauts-Bassins', 'NORD': 'Nord', 'PLATEAU CENTRAL': 'Plateau-Central', 'SAHEL': 'Sahel',
       'SUD OUEST': 'Sud-Ouest'}
sys.path.insert(0, str(Path(__file__).parent))
from parse_tables import parse_page
ACCENTS = {'Bale': 'Balé', 'Comoe': 'Comoé', 'Leraba': 'Léraba', 'Sanguie': 'Sanguié', 'Bazega': 'Bazèga',
           'Zoundweogo': 'Zoundwéogo', 'Kenedougou': 'Kénédougou', 'Passore': 'Passoré', 'Kourweogo': 'Kourwéogo',
           'Seno': 'Séno', 'Boulkiemde': 'Boulkiemdé', 'Koulpelogo': 'Koulpélogo', 'Komandjoari': 'Komondjari'}
couv, provinces = [], []
region_courante = None
for p in (55, 56):
    for r in parse_page(doc[p - 1]) or []:
        nom = r['nom']
        if not all(v.isdigit() for v in r['vals'].values()):
            continue
        if nom in REG:
            region_courante = REG[nom]
            for y, v in r['vals'].items():
                couv.append([REG[nom], int(y), int(v)])
        elif nom.startswith('BURKINA'):
            for y, v in r['vals'].items():
                couv.append(['Burkina Faso', int(y), int(v)])
        elif region_courante:
            for y, v in r['vals'].items():
                provinces.append([region_courante, ACCENTS.get(nom.title(), nom.title()), int(y), int(v)])
with open(OUT / 'couverture_regions_2015_2024.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['region', 'annee', 'taux_couverture_pct'])
    w.writerows(couv)
with open(OUT / 'couverture_provinces_2015_2024.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['region', 'province', 'annee', 'taux_couverture_pct'])
    w.writerows(provinces)

# Table large (une ligne par année) pour le modèle Power BI, avec le taux de couverture officiel (076.3)
national = {c[1]: c[2] for c in couv if c[0] == 'Burkina Faso'}
with open(OUT / 'bilan_cerealier_annuel.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['annee'] + [code for code, _ in POSTES] + ['taux_couverture_officiel_pct'])
    for y in YEARS:
        w.writerow([y] + [bilan[code][y] for code, _ in POSTES] + [national[y]])

print('Bilan :', len(POSTES), 'postes x', len(YEARS), 'années')
print('Corrections :', *corrections, sep='\n  ')
print('Écarts aux identités :', *(ecarts or ['aucun']), sep='\n  ')
print('Couverture : régions', len({c[0] for c in couv}), '| lignes', len(couv), '| provinces', len({p[1] for p in provinces}))
