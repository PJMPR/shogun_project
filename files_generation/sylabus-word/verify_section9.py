# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from docx import Document
from docx.oxml.ns import qn

doc = Document(r'C:\Users\adamu\WebstormProjects\pj-studies\public\assets\files\stacjonarne\PAI.docx')

for i, table in enumerate(doc.tables):
    for j, row in enumerate(table.rows):
        seen = set()
        uniq = []
        for cell in row.cells:
            if id(cell._tc) not in seen:
                seen.add(id(cell._tc))
                uniq.append(cell)
        for k, cell in enumerate(uniq):
            txt = cell.text.strip().replace('\n',' | ')[:80]
            tc = cell._tc
            tcPr = tc.find(qn('w:tcPr'))
            span = 1
            if tcPr is not None:
                gs = tcPr.find(qn('w:gridSpan'))
                if gs is not None:
                    span = int(gs.get(qn('w:val'), 1))
            if '9.' in txt or 'Wymiar' in txt or 'Bilans' in txt or 'Rodzaj' in txt or 'Zaj' in txt or 'Samodz' in txt:
                print(f'T{i} R{j} C{k} [s={span}]: {repr(txt)}')

