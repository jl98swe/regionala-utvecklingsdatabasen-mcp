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
  Definition, enhet och kodning har separata verifieringsstatusar.
  Harmoniseringskoden stoppar före uttagen tills jämförbarheten kontrollerats.
- Registeranmärkningarnas analyskonsekvenser tas med i skriptkommentarerna.
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

## Publicerad och verifierad

Publicerad 2026-11-20 kl. 16:30 svensk tid på befintlig MCP-adress.

- Runtime-källa: `34b75a92103ff33e827b7ee2aee0c51c7798171b`.
- Cloudflare-version: `adac72fa-d7cf-4778-982d-2596f96286b2`, 100 procent av trafiken.
- Byggd worker SHA-256: `1b5c44d710c8e38b05d2e19c3849720fc009492c27338d74f0dbde250cc96f43`.
- [Godkänd CI](https://github.com/jl98swe/regionala-utvecklingsdatabasen-mcp/actions/runs/44763230431): typkontroll, 35 TypeScript-/MCP-tester, tre Python-tester, Worker-bygge, riktig HTTP-klient, R-syntax och syntetiska R-tester.
- Alla 4 138 metadatafältsposter matchar projektets aktuella arbetsbok.
- Officiell MCP SDK-klient verifierade server 0.5.0, projektstöd 1.4, samtliga sju verktyg, registeranmärkning över 1998 och harmoniseringsplan över 2004/2005 via publik HTTPS.
- Ingen faktisk körning har gjorts i MONA. Registeranmärkningarnas tillämpning på beställningen och variabelversionernas innehållsmässiga jämförbarhet är fortfarande markerade som overifierade.

Driftsättningen använder samma lokalt byggda Worker som har kontrollerats ovan.
Transporten rekonstruerade den från föregående publicerade paket och en delta;
både tidigare paket och slutresultat verifierades med SHA-256 före uppladdning.
Inga extra resurser eller nya anslutningsadresser skapades.
