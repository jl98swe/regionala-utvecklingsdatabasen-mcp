# Regionala utvecklingsdatabasen MCP

Fristående, öppen MCP-server för att hitta register och variabler i SCB:s MONA-beställning Regionala utvecklingsdatabasen (P1481) och ta fram R-kod med mikrodataR.

**Status:** Server och tester finns i detta repository. En permanent publik MCP-adress kräver att en ägare ansluter Cloudflare och genomför första driftsättningen. En deploy-knapp eller ett lyckat byggtest betyder inte att servern är publicerad.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jl98swe/regionala-utvecklingsdatabasen-mcp)

Servern innehåller en gemensam metadatasnapshot för alla. Den saknar MONA-anslutning, databasdrivrutiner, användarkonton, filuppladdning och funktioner för att köra R eller SQL. Ingen AI-modell eller avgiftsbelagd API-tjänst används av servern. Kodmallarna är text som användaren själv granskar och kör i MONA.

## Funktioner

| Verktyg | Användning |
|---|---|
| `sok_variabler` | Sök på namn, vy eller dokumenterade ämnessynonymer. Tål skiftläge, åäö och alternativa separatorer. |
| `kontrollera_tillganglighet` | Kontrollera flera variabler och perioder på variabelnivå. |
| `hamta_registerstruktur` | Lista vyer, variabler och möjliga kopplingsnycklar. |
| `hamta_kodmall` | Lista/hämta R-mallar för registerkoppling, examenskohort och invandringsuppföljning. |

Svar innehåller `structuredContent`, en textrepresentation och `metadata_sha256`. Servern använder stateless Streamable HTTP på **`/mcp`**, utan inloggning. `/health` visar laddad metadataversion. GET `/mcp` ger 405 eftersom servern inte erbjuder en separat SSE-ström; klienten ska använda Streamable HTTP POST.

## Metadata och tillgänglighet

Källa: den tillhandahållna `metadata_variabler.xlsx` (bifogad kopia med suffix `(2)`). Snapshoten innehåller **4 138 poster, 88 vyer och 1 264 poster med okänd tillgänglighet**. Ursprunglig SHA-256 finns i `data/metadata.json` och i varje verktygssvar. Originalnamn och beställningsspecifika löpnummer bevaras. Originalarbetsboken och dess dokumentegenskaper publiceras inte.

* Varje variabels **eget `År`** styr. `Från år`/`Till år` beskriver vyn och används aldrig som ersättning.
* Tomt år ger `unknown`, inte tillgänglighet för alla år. Tolkningsfel ger `unparsed`.
* Årsintervall, enskilda år, månadsintervall och åtskilda intervall stöds.
* År mot månadsregister kräver 12 tillgängliga månader: färre ger `partial`. Månadsfråga mot årsregister ger `granularity_mismatch`.
* Saknat känt år ger `unavailable`. Ogiltigt namn ger ett strukturerat fel med `isError: true`.
* Matchning normaliserar endast till unika namn. Originalnamnet i svaret ska användas i R. Stavfel rättas inte tyst.
* Metadata innehåller inte variabeldefinitioner, kodlistor, analysenheter eller belägg för nycklarnas unikhet. Sådan information får inte antas.

## Anslut en AI-klient

Efter publicering: kopiera den **faktiska** Worker-adressen från Cloudflare och lägg till `/mcp`. Exempeldomäner nedan är platshållare.

### ChatGPT

Lägg till en anpassad app/MCP-anslutning i ChatGPTs inställningar. Ange serverns HTTPS-adress med `/mcp` och välj ingen autentisering. Anpassade appar kan kräva utvecklarläge och arbetsytans administratörsbehörighet; tillgång beror på abonnemang och policy. En publik MCP-adress gör inte klientens eget abonnemang gratis.

Börja exempelvis med: **Exempel:** ”Hitta Kommun i RTB, kontrollera 2024 och 2025 och visa metadataunderlag innan du skriver R-kod.”

### Claude Code

```bash
claude mcp add --transport http regionala-utvecklingsdatabasen https://DIN-WORKER.workers.dev/mcp
```

Kontrollera anslutningen med `/mcp`. Claude-appar som har gränssnitt för egna fjärranslutningar kan använda samma URL. Den här leveransen är inte testad inne i ChatGPTs eller Claudes användargränssnitt.

### Andra klienter och faktisk protokollkontroll

Välj remote HTTP/Streamable HTTP, samma URL och ingen autentisering. Klienter som endast stöder stdio eller gamla HTTP+SSE behöver uppdateras eller en separat brygga.

```bash
npm ci
npm run smoke -- https://DIN-WORKER.workers.dev/mcp
```

Detta startar den officiella MCP TypeScript SDK-klienten, initierar anslutningen, listar fyra verktyg och anropar samtliga. `tests/transport.test.ts` kör också en faktisk SDK-klient med HTTP-transport mot Worker-handlern utan nätverk. CI kör separat samma klient över lokal HTTP mot Wrangler/workerd.

## Utveckla och testa

Kräver Node.js 22.12+ (24 rekommenderas), npm och Python 3 för metadatauppdatering. R behövs för syntax- och metodtester, inte i serverns driftmiljö.

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev
# I en annan terminal:
npm run smoke
```

GitHub Actions kör TypeScript-kontroll, tester, Worker-bygge, HTTP-klienttest samt R-syntax och syntetiska tester av kopplingskontroller. Inga MONA-frågor körs. CI har bara läsrättighet till repositoryt.

## Kodmallarnas kontrollnivå

* `kombinera_register`: validerar varje efterfrågad variabel och period innan kod lämnas. Känd otillgänglighet blockerar generering. Okänd tillgänglighet ger varning och krav på kontroll i MONA. `period: null` är ett uttryckligt användarval för en icke årsindelad vy; ett tomt årsfält bevisar inte att vyn är sådan.
* `ltu_examen`: generell delmall för examinerade, rekryteringskommun året före Ffgar och bosättning ett fast målår. Detta är inte en mall för alla studieavslut, och inte hela LTU-analysen.
* `invandring_etablering`: generell delmall för första invandring inom vald period, utrikes födda och fast RTB/BAS-uppföljning. Inte hela Nederländerna-analysen.

Mallarna bevarar namnen, använder `uppkoppling_db()` och `hamta_korrekt_vynamn(period, vy)`, kontrollerar faktiska kolumner, stänger anslutningen med `on.exit()` och kräver inte Excel vid körning. Utdatamapp är konfigurerbar via `RUD_UTDATA`. De exporterar inte individdata automatiskt. Års-BAS och preliminär månads-BAS blandas inte.

Kopplingsmallen kräver en rad per person i varje uttag. Identiska dubblettrader får tas bort uttryckligen; andra dubbletter stoppar körningen. Händelseregister behöver en motiverad aggregering innan koppling. Ingen godtycklig ”första rad” väljs.

**Anpassade mallar är metadata- och syntaxkontrollerade genom tester, men har inte provkörts i MONA.** mikrodataR 0.1.0:s funktionsförteckning och tidigare användningsmönster finns i metodunderlaget; fullständig aktuell API-dokumentation och en MONA-miljö finns inte här. Kontrollera därför aktuell paketversion/signatur vid första körning. HREG- och migrationsmallarna kan inte få bekräftad årstillgänglighet från den här metadatafilen.

## Uppdatera metadata

1. Skapa en ny export separat i MONA och granska att den endast innehåller variabelmetadata.
2. Kör lokalt:

```bash
python3 scripts/import_metadata.py /sokvag/metadata_variabler.xlsx
npm test
```

3. Granska diffen i `data/metadata.json`, inklusive antal och SHA-256. Vid avsiktlig förändring uppdateras snapshotförväntningarna i testerna. Importören använder Excel-cellreferenser och ignorerar felaktigt snäva dimensionsuppgifter i arbetsboken.
4. Committa JSON och uppdaterade tester via en PR. Ingen filuppladdnings- eller metadataändringsfunktion exponeras publikt.
5. Merge och driftsätt samma commit; verifiera `/health` och kör smoke-klienten.

R-mallar uppdateras i `templates/`, följt av `python3 scripts/embed-templates.py`. CI kontrollerar att den inbäddade kopian är aktuell. `Hamta_mikrodatabasen_struktur.R` används inte av projektet.

## Drift och kostnad

Se [driftinstruktionerna](docs/DEPLOYMENT.md). Cloudflare Workers Free är ett möjligt startalternativ: 100 000 anrop/dygn och 10 ms CPU per anrop enligt dokumentationen kontrollerad 2026-11-14. En klientåtgärd kan ge flera HTTP-anrop. Gratisplanen saknar löfte om obegränsad kapacitet och den faktiska CPU-förbrukningen måste kontrolleras efter publicering. Denna server har inga Durable Objects, KV, databas eller betalda AI-anrop. Välj Free, aktivera inga betalda tillägg och använd inte automatisk uppgradering.

Användning av servern är gratis. Kostnader och tillgång till ChatGPT, Claude eller andra klienter är separata.

## Källor och avgränsning

* Tillhandahållen metadataexport: styrande för namn och tillgänglighet.
* `Analys_examinerade_LTU_v17.R` och `Analys_invandring_Nederlanderna_Norrbotten_v7.R`: metodstöd; personliga författaruppgifter, sökvägar och beroenden återpubliceras inte.
* `mikrodataR_description.txt`, version 0.1.0: funktionsförteckning, inte fullständig API-verifiering.
* [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/server)
* [Cloudflare Workers-gränser](https://developers.cloudflare.com/workers/platform/limits/)
* [Cloudflare remote MCP](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/)
* [ChatGPT anpassade MCP-anslutningar](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)
* [Claude Code MCP](https://code.claude.com/docs/en/mcp)

DeSO-skriptet och de två uttryckligen undantagna kodrepositorierna används inte. Servern beskriver denna beställning, inte alla SCB:s register. MIT-licens för projektets kod; metadata publiceras med beställarens uttryckliga tillstånd. Ingen SCB-anslutning eller officiell SCB-produkt görs gällande.
