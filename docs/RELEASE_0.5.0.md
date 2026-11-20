# Version 0.5.0 – registerkunskap och generellt metodstöd

R-mallar 1.3, projektstöd 1.4, registerkunskap 1.0. Datum 2026-11-20.

## Ändringar

- Strukturerade, källbelagda registeranmärkningar med sidor och granskningsdatum.
- Registerårgång skiljs från händelseår och uppföljningsår. Anmärkningar
  gäller före/vid/över brytpunkter och informerar även när årsbegreppet är okänt.
- SCB-dokumentationens status skiljs från verifiering av vår beställning.
- Anmärkningar följer med i sökning, registerstruktur, årskontroll och kodmallar.
- Generella regler för tidsupplösning, population, analysenhet och kopplingar.
- Dokumenterade namnkopplingar kan generera årsuttag med rätt originalnamn,
  numerisk konvertering, gemensamt analysnamn och bevarat uttagsår.
- Liknande variabelnamn visas som kandidater utan automatisk sammanslagning.
- Ingen generell händelseprioritering införs. Kopplingsmallen tar inte bort
  identiska rader utan uttryckligt val. Invandringsmallens särskilda metod
  kräver bekräftelse och använder inte automatiskt första händelse i livet.
- Alla sju befintliga verktyg och nyckelregistret finns kvar. Tidigare
  mallversioner är arkiverade. README:s befintliga struktur bevaras.

## Verifiering före publicering

Typkontroll, 35 TypeScript-/MCP-tester, tre Python-tester och syntetiska
R-tester. R-kontroller täcker även gränsen 2004/2005, numerisk konvertering,
bevarade identifierare och bortfall. Testdata är syntetisk och ingen
MONA-anslutning görs i dessa tester. Worker-paket byggs med dry-run.

Publicering och offentlig verifiering dokumenteras efter driftsättning.
