import re, sys, json
sys.stdout.reconfigure(encoding='utf-8')
import os
import pymupdf

# Chemin du PDF de l'annuaire 2024 (MARAH/DGESS) : variable d'environnement ANNUAIRE_PDF,
# sinon le fichier placé dans le dossier courant.
PDF = os.environ.get('ANNUAIRE_PDF', 'Annuaire_agro-sylvo-pastorale_2024.pdf')
YEARS = [str(y) for y in range(2015, 2025)]

def parse_page(pg):
    w = pg.get_text('words')
    # header years: the row with all ten years
    by_y = {}
    for x in w:
        if x[4] in YEARS:
            by_y.setdefault(round(x[1]), []).append(x)
    hdr = None
    for y, toks in by_y.items():
        if len({t[4] for t in toks}) == 10:
            hdr = sorted(toks, key=lambda t: t[0])
            break
    if hdr is None:
        return None
    centers = {t[4]: (t[0] + t[2]) / 2 for t in hdr}
    hy = hdr[0][1]
    # data words below header
    data = [t for t in w if t[1] > hy + 4 and t[4] not in YEARS]
    rows = []
    for t in sorted(data, key=lambda t: (round(t[1] / 4), t[0])):
        yc = (t[1] + t[3]) / 2
        if rows and abs(rows[-1]['y'] - yc) < 4:
            rows[-1]['toks'].append(t)
        else:
            rows.append({'y': yc, 'toks': [t]})
    out = []
    for r in rows:
        name_toks = [t for t in r['toks'] if re.search(r'[A-Za-zÀ-ÿ]', t[4]) and t[0] < 150]
        name = ' '.join(t[4] for t in sorted(name_toks, key=lambda t: t[0]))
        cells = {y: [] for y in YEARS}
        for t in r['toks']:
            if t in name_toks:
                continue
            cx = (t[0] + t[2]) / 2
            y = min(YEARS, key=lambda yy: abs(centers[yy] - cx))
            if abs(centers[y] - cx) > 22:
                continue
            cells[y].append(t)
        vals = {}
        for y in YEARS:
            s = ''.join(re.sub(r'[\s\u202f\u00a0]', '', t[4]) for t in sorted(cells[y], key=lambda t: t[1]))
            vals[y] = s
        if name:
            out.append({'nom': name, 'vals': vals})
    return out

if __name__ == '__main__':
    doc = pymupdf.open(PDF)
    res = {}
    for pn in range(int(sys.argv[1]), int(sys.argv[2]) + 1):
        pg = doc[pn - 1]
        title = [l for l in pg.get_text().split('\n') if l.startswith('Tableau')]
        res[pn] = {'titre': title[0] if title else '', 'lignes': parse_page(pg)}
    print(json.dumps(res, ensure_ascii=False, indent=1))
