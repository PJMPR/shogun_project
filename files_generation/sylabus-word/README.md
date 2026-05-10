# Generator syllabusów Word (python-docx)

Zestaw skryptów generujący pliki `.docx` syllabusów na podstawie plików JSON,
zgodnie z szablonem PJATK `Sylabus3.0_PL.docx`.

## Wymagania

- Python 3.10+
- Biblioteka `python-docx`

## Instalacja

```bash
cd sylabus-word
pip install -r requirements.txt
```

## Użycie

### Generuj wszystkie syllabuy (stacjonarne + niestacjonarne)

```bash
python generate_syllabus.py
```

### Generuj tylko wybrane kody przedmiotów

```bash
python generate_syllabus.py PAI
python generate_syllabus.py PAI RBD WPR
```

## Mapowanie katalogów

| Wejście (JSON) | Wyjście (DOCX) |
|---|---|
| `public/assets/syllabusy/*.json` | `public/assets/files/stacjonarne/*.docx` |
| `public/assets/syllabusy-n/*.json` | `public/assets/files/niestacjonarne/*.docx` |

## Struktura plików

```
sylabus-word/
├── generate_syllabus.py   # Główny skrypt
├── syllabus_builder.py    # Klasa budująca dokument Word
├── styles.py              # Stałe stylów
├── requirements.txt       # Zależności
└── README.md              # Ta dokumentacja
```

## Pola JSON → dokument Word

| Sekcja | Pole JSON |
|---|---|
| 1. Nazwa polska | `sylabus.nazwa_przedmiotu` |
| 2. Wersja z dnia | `sylabus.wersja_z_dnia` |
| 4. Kod przedmiotu | `sylabus.kod_przedmiotu` |
| 5. Jednostka | `sylabus.jednostka` |
| 6. ECTS | `sylabus.ects` |
| 7. Studia | `sylabus.kierunek`, `tryb_studiow`, `semestr_studiow`, `profil` |
| 8. Odpowiedzialny | `sylabus.odpowiedzialny_za_przedmiot` |
| 9. Godziny | `sylabus.forma_i_liczba_godzin_zajec`, `sylabus.godziny` |
| 11. Metody | `sylabus.metody_dydaktyczne` |
| 12. Zaliczenie | `sylabus.zaliczenie`, `sylabus.kryteria_oceny` |
| 13. Przedmioty wprowadzające | `sylabus.przedmioty_wprowadzajace` |
| 14. Cel dydaktyczny | `sylabus.cel_dydaktyczny`, `sylabus.cel_dydaktyczny_eng` |
| 15. Treści programowe | `sylabus.tresci_programowe` |
| 17. Literatura | `sylabus.literatura` |
| 18-20. Efekty kształcenia | `sylabus.efekty_ksztalcenia` |

