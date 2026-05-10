# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from docx import Document
from docx.oxml.ns import qn

doc = Document('Sylabus3.0_PL.docx')

# Znajdź tabelę zawierającą punkt 9
for i, table in enumerate(doc.tables):
    for j, row in enumerate(table.rows):
        for k, cell in enumerate(row.cells):
            txt = cell.text.strip()
            if '9.' in txt and 'Formy' in txt:
                print(f'\n=== ZNALEZIONO tabele {i}, wiersz {j}, kol {k} ===')
                # Drukuj całą tabelę
                print(f'Tabela {i}: {len(table.rows)} wierszy x {len(table.columns)} kolumn')
                for rr, rrow in enumerate(table.rows):
                    cells_uniq = []
                    seen = set()
                    for cc, ccell in enumerate(rrow.cells):
                        if id(ccell._tc) not in seen:
                            seen.add(id(ccell._tc))
                            cells_uniq.append((cc, ccell))
                    for cc, ccell in cells_uniq:
                        ctxt = ccell.text.strip()
                        # sprawdz colspan
                        tc = ccell._tc
                        gridSpan = tc.find(qn('w:tcPr'))
                        span = 1
                        if gridSpan is not None:
                            gs = gridSpan.find(qn('w:gridSpan'))
                            if gs is not None:
                                span = int(gs.get(qn('w:val'), 1))
                        if ctxt:
                            print(f'  R{rr} C{cc} [span={span}]: {repr(ctxt[:100])}')
                        else:
                            print(f'  R{rr} C{cc} [span={span}]: (pusty)')

