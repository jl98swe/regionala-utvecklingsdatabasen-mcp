# Kravgenomgång 2026-11-14

Jämförelse mot byggbeställningen och MONA-projektets aktuella instruktioner.

| Krav | Resultat / ändring |
|---|---|
| Publik, fristående MCP; fyra funktioner; Streamable HTTP | Befintligt. Samma adress och fyra verktyg kvar. |
| Gemensam metadata; exakta namn och egna variabelår | Befintligt. 4 138 poster, 88 vyer, 1 264 okända. Aktuell projektarbetsbok har identiska metadatafält. |
| Tomma år, års-/månadsintervall, olika år inom vy, uppdatering | Befintlig import och tester; tomma år blir aldrig alla år. |
| Källprioritet och SCB-definitioner | Tillagt projektstöd med fem källnivåer och https://mikrometadata.scb.se/. Servern hämtar inte definitioner; klienten behöver läsa dem vid behov. |
| mikrodataR före manuella lösningar; kontrollera dokumentation | Tillagt 11 tillhandahållna funktionsbeskrivningar med signaturer och argument, dokumentationsbegränsningar och kontroll av installerad vynamnsfunktion. Rd saknar vissa returformat och löften om NULL/månader; osäkerheten redovisas. |
| Character; numerisk konvertering före sortering/filter/aggregering | Tillagt strikt hjälpfunktion med konfigurerbara bortfallskoder. Tidsfält i metodmallarna använder den. |
| UTF-8; bevara identifierare, åäö och original | Tillagt iconv vid textbearbetning; kollisionskontroll för normaliserad gruppering/jämförelse; inga nycklar skrivs om. |
| Dubbletter; justerbar namngiven funktion; hela rader | Befintlig unik() förtydligad. Exakta identiska rader kan tas bort, konflikter stoppar. Personnyckel och en-till-en dokumenteras; ingen godtycklig rad väljs. |
| Bevara metod, struktur och kommentarer; hela skriptet | Projektstöd instruerar detta. Returnerad kod är fullständig. Tidigare mallar bevaras oförändrade i arkiv. |
| Filversion, skapare och datum | Mallversion 1.1 i filnamn och intro. Vid användaranpassning ska senaste användarversion och ansvarig skapare styra. |
| LTU och Nederländerna som generellt metodstöd | Avgränsade mallar kvar. Examensmallen ersätter inte analys av registrerade studenter; invandringsmallen ersätter inte hela Nederländerna-analysen. |
| Ingen MONA-körning eller databasanslutning från servern | Oförändrat. Endast metadata och R-text exponeras. |
| Tester, öppen licens, separat GitHub, klientinstruktioner | Befintligt, utökat med regressionstester för projektstöd, kodning, numerisk ordning och versionsinfo. |
| Gratis drift | Inga nya betaltjänster eller lagring tillagda. Leverantörens kapacitetsgränser gäller. |
| Faktisk MCP-klient | Officiell SDK-klient; publik smoke-kontroll efter publicering. ChatGPT-/Claude-gränssnitt och MONA-exekvering är fortsatt ej verifierade här. |
| Automatisk publicering | Fortfarande separat kontokoppling/hemligheter; denna uppdatering publiceras med befintlig Cloudflare-anslutning. |

## Kontrollens gräns

Att servern innehåller reglerna betyder inte att klientens AI alltid följer dem. En saknad funktion eller felaktig mall kan rättas centralt, medan metodval och användarens egna R-skript fortfarande kräver granskning. År med okänd tillgänglighet och odokumenterade kodbetydelser får inte beskrivas som verifierade. DeSO och de två undantagna kodrepositorierna används inte.
