# Testresultat 2026-11-14

## Publicerad version

* Runtime-källa: commit `a2b607eb21d3883d0f329dbd407ce683574f8b8b`.
* Cloudflare Worker: `regionala-utvecklingsdatabasen-mcp`, subdomän `jl98swe`.
* Publik endpoint: https://regionala-utvecklingsdatabasen-mcp.jl98swe.workers.dev/mcp
* Metadata-SHA-256: `f3d3b2b7713121cf533e73621602f76f6c9b549aad9b044dd8bff05a414f68be`.
* Efterföljande dokumentations-/kontokonfigurationscommits ändrar inte serverns analyslogik.

## Genomförda kontroller

| Kontroll | Resultat |
|---|---|
| TypeScript typkontroll | Godkänd lokalt och i GitHub Actions |
| TypeScript/MCP-testfall | 19 godkända |
| Python-importtestfall | 3 godkända; felaktig Excel-dimension, dubbletter och tomt år |
| Fullständig källjämförelse | Samtliga 4 138 rader och fem kolumner matchar arbetsboken exakt |
| Periodtolkning | Alla icke-tomma årsfält kan tolkas; 1 264 tomma fält förblir okända |
| Variabler med olika år i samma vy | Godkänt, bland annat ak6 och RTB |
| Månader och felaktiga perioder | Godkänt; december/januari, ogiltig månad och granularitet |
| Alternativa skrivsätt och felaktiga namn | Godkänt; originalnamn bevaras och okända namn stoppas |
| Flera register i kodmall | Godkänt; variabel-/periodkontroll och en-till-en-koppling |
| Worker-bygge | Godkänt |
| Officiell MCP-klient mot Worker-handler | Godkänt; initialize, tools/list, alla fyra verktyg och felanrop |
| Officiell MCP-klient över lokal HTTP/workerd | Godkänt i GitHub Actions |
| Officiell MCP-klient över publik HTTPS | Godkänt mot publicerad adress; alla fyra verktyg |
| R-syntax | Alla tre källmallar och tre genererade skript godkända i GitHub Actions |
| Syntetiska R-tester | Godkänt; identiska dubbletter, motstridiga dubbletter, tomma/saknade nycklar, bibehållen population och stopp vid fel kardinalitet |
| Exekvering och utgående åtkomst | Worker-test passerar med förbjuden outbound fetch; ingen R-/SQL-exekveringsfunktion eller MONA-konfiguration i servern |
| npm audit | Inga rapporterade sårbarheter vid kontrollen |

CI för runtime-källan: https://github.com/jl98swe/regionala-utvecklingsdatabasen-mcp/actions/runs/43604821755

## Gränser för verifieringen

* Anpassade R-mallar har inte körts i MONA. De returnerar `mona_execution: not_run` och har kontroller för första körningen i MONA.
* HREG och migrationshistorik har tomma årsfält i exporten. Ingen bekräftad tillgänglighet för valda år kan därför utlovas från metadata.
* Tillhandahållna Rd-filer finns nu i projektstödet. Installerat paket, vissa returformat och NULL-/månadsbeteende har inte verifierats i MONA.
* Kodmallarna för LTU och invandring är dokumenterade delmallar, inte fullständiga kopior av de äldre analyserna. Examensuppföljning får inte likställas med alla studieavslut.
* Protokollet har testats med en faktisk SDK-baserad MCP-klient. Ingen manuell anslutning i ChatGPTs eller Claudes användargränssnitt har utförts.
* Gratisdrift är inte ett löfte om obegränsad kapacitet. CPU- och trafikgränser måste följas. Inga betalda Cloudflare-tjänster aktiverades; faktureringsuppgifter är inte tillgängliga via den anslutna OAuth-behörigheten.
* Automatisk publicering från GitHub kräver separat koppling eller Actions-hemligheter. Tester körs redan automatiskt.

## Uppdatering 0.2.0 / mallar 1.1

Projektregler, dokumenterade mikrodataR-signaturer, versionsinformation, UTF-8- och numerisk hantering har tillkommit. Aktuell projektarbetsbok har jämförts mot snapshoten: metadatafält och alla 4 138 poster är identiska. Föregående mallar är arkiverade. Testsviten är utökad med projektstöd via MCP, konvertering av tidsfält före aggregering och syntetiska R-tester för svenska tecken, textkollisioner, bortfallskoder och numerisk ordning. Aktuell CI och publiceringskontroll ska följas för den nya committen; tabellen ovan beskriver ursprungsleveransen.
