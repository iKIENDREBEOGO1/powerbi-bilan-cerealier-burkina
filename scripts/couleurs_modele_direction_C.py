"""Adapte au fond sombre (direction C, Salle de veille) les couleurs renvoyées par les mesures du modèle.

Les mesures de couleur (barres, carte thermique, nuage de points, phrases de contexte) renvoient des codes
hexadécimaux pensés pour le fond sable de la direction A. Ce script les remplace, dans la copie
pbip_salle_de_veille uniquement, par l'échelle cyan / ambre de la direction C.
Usage : python couleurs_modele_direction_C.py
"""
import re
from pathlib import Path

TABLES = Path(__file__).resolve().parent.parent / 'pbip_salle_de_veille' / 'Bilan cerealier Burkina.SemanticModel' / 'definition' / 'tables'

CORRESPONDANCE = {
    '#2F6B3B': '#8CEEEE',  # favorable : vert mil -> cyan
    '#B5541B': '#F5A524',  # alerte : ocre latérite -> ambre
    '#8E3B12': '#F5A524',  # carte thermique < 50 % et déficit chronique -> ambre vif
    '#C9733F': '#B7791F',  # 50 à 79 % -> ambre moyen
    '#E08A4F': '#B7791F',  # déficit récent -> ambre moyen
    '#EBC9A6': '#5A4524',  # 80 à 99 % -> ambre sombre
    '#B9D3B4': '#1E5A63',  # 100 à 149 % -> sarcelle sombre
    '#8FA382': '#5B7FA6',  # sorti du déficit -> bleu acier
    '#FFFDF8': '#1C1838',  # cellule vide -> fond de carte
    '#FFFFFF': '#120E2A',  # texte sur cellule vive -> bleu nuit
    '#2B2A26': '#ECEAF7',  # texte sur cellule sombre -> blanc lavande
}
motif = re.compile('|'.join(re.escape(k) for k in CORRESPONDANCE), re.IGNORECASE)

for fichier in sorted(TABLES.glob('*.tmdl')):
    texte = fichier.read_text(encoding='utf-8')
    nouveau, n = motif.subn(lambda m: CORRESPONDANCE[m.group(0).upper()], texte)
    if n:
        fichier.write_text(nouveau, encoding='utf-8')
    print(f'{fichier.name} : {n} couleur(s) remplacée(s)')
