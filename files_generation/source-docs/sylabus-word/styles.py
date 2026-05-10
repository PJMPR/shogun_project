# -*- coding: utf-8 -*-
"""Stałe stylów dla generatora syllabusów Word."""

from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

# Kolory — przechowywane jako hex string (bezpośrednio do XML)
COLOR_HEADER_BG = 'D9D9D9'    # Szare tło nagłówków sekcji
COLOR_HEADER_DARK = 'BFBFBF'  # Ciemniejsze szare
COLOR_WHITE = 'FFFFFF'
COLOR_BLACK = '000000'

# Czcionki
FONT_NAME = "Aptos"
FONT_SIZE_NORMAL = Pt(11)
FONT_SIZE_LABEL = Pt(11)
FONT_SIZE_TITLE = Pt(13)
FONT_SIZE_HEADER = Pt(11)

# Marginesy
MARGIN_TOP = Cm(1.5)
MARGIN_BOTTOM = Cm(1.5)
MARGIN_LEFT = Cm(2.0)
MARGIN_RIGHT = Cm(2.0)
