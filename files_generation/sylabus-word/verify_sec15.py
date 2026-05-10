# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from docx import Document
from docx.oxml.ns import qn

doc = Document(r'C:\Users\adamu\WebstormProjects\pj-studies\public\assets\files\stacjonarne\KSI.docx')

for i, table in enumerate(doc.tables):
    for j, row in enumerate(table.rows):
        seen = set()
        uniq = []
        for cell in row.cells:
            if id(cell._tc) not in seen:
                seen.add(id(cell._tc))
                uniq.append(cell)
        for k, cell in enumerate(uniq):
            txt = cell.text.strip().replace('\n',' | ')[:60]
            if True:  # drukuj wszystko
                tc = cell._tc
                tcPr = tc.find(qn('w:tcPr'))
                span = 1
                w_val = ''
                if tcPr is not None:
                    gs = tcPr.find(qn('w:gridSpan'))
                    if gs is not None:
                        span = int(gs.get(qn('w:val'), 1))
                    tcW = tcPr.find(qn('w:tcW'))
                    if tcW is not None:
                        w_val = tcW.get(qn('w:w'), '')
                print(f'T{i} R{j} C{k} [s={span} w={w_val}]: {repr(txt)}')

