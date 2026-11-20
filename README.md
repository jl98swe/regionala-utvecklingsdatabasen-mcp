# Regionala utvecklingsdatabasen MCP

## Vad kan du använda den till?

Med den här tjänsten kan du få hjälp av en AI-assistent att planera analyser och skriva R-kod för Regionala utvecklingsdatabasen i SCB:s MONA. Du beskriver vad du vill undersöka med vanliga ord. AI-assistenten kan sedan söka i databasens variabelförteckning och använda dokumentationen för R-paketet mikrodataR som stöd.

Tjänsten hjälper dig att:

- hitta register och variabler som kan vara relevanta för din fråga,
- kontrollera vilka år eller månader en variabel finns för,
- undersöka vilka register som kan kopplas samman och vilka nycklar som finns,
- ta fram R-kod och anpassa kodmallar för din analys.

Med nyckelregistret i version 0.4.0 kan du också hitta förklaringar till kodvärden och se vilka namn- eller gruppkolumner som kan läggas till i dina data. Du kan kontrollera möjliga kopplingar innan du använder `fjoin_klartext()` i R. **Nyckelregistret håller på att införas; de tre nya verktygen beskrivs nedan.**

**Exempel på frågor att börja med:**

> Vilka register och variabler kan jag använda för att följa personer efter högskolestudier?

> Kontrollera om variablerna jag behöver finns för åren 2020–2024 innan du skriver koden.

> Hjälp mig att skriva ett R-skript som kopplar ihop de här registren. Förklara hur dubbletter ska hanteras.

**Exempel för nyckelregistret i version 0.4.0:**

> Vilka klartextkolumner kan läggas till om mina data innehåller kolumnen AstKommun? Kontrollera också om nyckelfilerna innehåller dubbletter som kan påverka kopplingen.

Underlaget gäller MONA-beställningen **Regionala utvecklingsdatabasen (P1481)**. AI-assistenten får tillgång till en förteckning över register och variabler samt dokumentation och kodmallar. Själva mikrodatan finns kvar i MONA. Du granskar R-koden och kör den i MONA med din egen behörighet. Tjänsten kan inte hämta resultat ur MONA eller köra analysen åt dig.

## Vad är en MCP?

MCP står för *Model Context Protocol*. Det är en gemensam standard som gör att AI-tjänster kan använda externa verktyg och informationskällor.

I det här fallet fungerar MCP-anslutningen som en länk mellan din AI-assistent och dokumentationen för Regionala utvecklingsdatabasen. När du ställer en fråga kan assistenten söka efter rätt variabler, kontrollera år och hämta kodmallar under samtalet. Du behöver alltså inte själv kopiera in hela variabelförteckningen i varje ny chatt.

## Vad behöver du för att använda den?

Du behöver en AI-tjänst som stöder egna MCP-anslutningar över internet. **Tjänsten är gratis att använda och fungerar även i gratisversioner av AI-tjänster som har det stödet.** Ett exempel är Claude, där gratisversionen tillåter en egen MCP-anslutning enligt [Claudes dokumentation](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), kontrollerad den 20 november 2026. AI-tjänstens vanliga gränser för användning gäller fortfarande. Stödet kan skilja sig mellan program, abonnemang och organisationers inställningar.

För att ansluta:

1. Öppna AI-tjänstens inställningar för appar, anslutningar eller verktyg.
2. Lägg till en egen MCP-anslutning med adressen nedan.
3. Välj ingen autentisering eller inloggning om programmet frågar.
4. Aktivera anslutningen i samtalet och beskriv vad du vill undersöka.

**MCP-adress:**

```text
https://regionala-utvecklingsdatabasen-mcp.jl98swe.workers.dev/mcp
```

Du behöver ingen API-nyckel och behöver inte installera servern på din dator. I en organisations gemensamma AI-miljö kan en administratör behöva lägga till eller godkänna anslutningen.

Du behöver ingen MONA-behörighet för att söka i dokumentationen. För att köra den föreslagna R-koden och analysera data behöver du däremot tillgång till beställningen P1481 och de R-paket som koden använder, bland annat mikrodataR. Granska alltid att urval, kopplingar och beräkningar passar din analys.


<details>
<summary>Anslut en AI-tjänst</summary>

Använd den publika MCP-adressen ovan. Ingen API-nyckel behövs.

### ChatGPT

Lägg till en anpassad app/MCP-anslutning i ChatGPTs inställningar. Ange serverns HTTPS-adress med `/mcp` och välj ingen autentisering. Anpassade appar kan kräva utvecklarläge och arbetsytans administratörsbehörighet; tillgång beror på abonnemang och policy. Se avsnittet ovan om stöd i gratisversioner. Tillgången till egna MCP-anslutningar varierar mellan klienter.

Börja exempelvis med: **Exempel:** ”Hitta Kommun i RTB, kontrollera 2024 och 2025 och visa metadataunderlag innan du skriver R-kod.”

### Claude Code

```bash
claude mcp add --transport http regionala-utvecklingsdatabasen https://regionala-utvecklingsdatabasen-mcp.jl98swe.workers.dev/mcp
```

Kontrollera anslutningen med `/mcp`. Claude-appar som har gränssnitt för egna fjärranslutningar kan använda samma URL. Den här leveransen är inte testad inne i ChatGPTs eller Claudes användargränssnitt.

### Andra klienter och faktisk protokollkontroll

Välj remote HTTP/Streamable HTTP, samma URL och ingen autentisering. Klienter som endast stöder stdio eller gamla HTTP+SSE behöver uppdateras eller en separat brygga.

```bash
npm ci
npm run smoke -- https://regionala-utvecklingsdatabasen-mcp.jl98swe.workers.dev/mcp
```

Detta startar den officiella MCP TypeScript SDK-klienten, initierar anslutningen, listar fyra verktyg och anropar samtliga. `tests/transport.test.ts` kör också en faktisk SDK-klient med HTTP-transport mot Worker-handlern utan nätverk. CI kör separat samma klient över lokal HTTP mot Wrangler/workerd.

</details>

---

<details>
<summary>Teknisk dokumentation för den som utvecklar eller förvaltar tjänsten</summary>

## Funktioner

| Verktyg | Användning |
|---|---|
| `sok_variabler` | Sök på namn, vy eller dokumenterade ämnessynonymer. Tål skiftläge, åäö och alternativa separatorer. |
| `kontrollera_tillganglighet` | Kontrollera flera variabler och perioder på variabelnivå. |
| `hamta_registerstruktur` | Lista vyer, variabler och möjliga kopplingsnycklar. |
| `hamta_kodmall` | Lista/hämta R-mallar för registerkoppling, examenskohort och invandringsuppföljning. |
| `sok_nycklar` *(0.4.0)* | Sök bland nyckelfilernas fil- och kolumnnamn. Visa vilka kolumner och grupperingar en nyckelfil innehåller. |
| `hamta_nyckel` *(0.4.0)* | Hämta en vald kodlista eller sök efter koder och klartext i den. |
| `kontrollera_klartextkoppling` *(0.4.0)* | Utgå från datans kolumnnamn och visa möjliga nyckelfiler, tillkommande kolumner och risker vid koppling. |

De tre verktygen märkta **0.4.0** finns i byggpaketet för nyckelregistret. De är ännu inte införda på `main` vid denna dokumentationsuppdatering.

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

## Nyckelregistret i version 0.4.0

Nyckelregistret skiljer på **vilka kolumner en fil innehåller** och **vilka kodvärden som finns i filen**. `sok_nycklar` hjälper dig att hitta rätt fil utifrån dess rubriker eller namn. Med `hamta_nyckel` kan du sedan läsa innehållet eller söka efter en viss kod eller benämning.

Inför en klartextkoppling kan du låta `kontrollera_klartextkoppling` granska datans kolumnnamn. Kontrollen visar vilka nyckelfiler som kan matcha, vilka kolumner som kan tillkomma och om överlapp eller dubbletter behöver granskas. Skicka bara kolumnnamnen till den kontrollen.

**Det är rubrikraden som styr matchningen.** Filnamnet räcker inte för att avgöra hur en koppling fungerar. Kontrollen visar möjliga kopplingar; resultatet från `fjoin_klartext()` kan även påverkas av bearbetningsordning och kolumner som redan finns i dina data. Kontrollera därför beteendet i den installerade versionen av mikrodataR.

Originalfilerna ändras inte. Kodlistornas grupperingar, dubbletter och tomma värden bevaras i registret. Ett datum för importen visar när kopian skapades, inte vilka år en klassifikation gäller för. Databasens variabelförteckning avgör fortfarande vilka vyer, variabler och år som finns i beställningen.

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

Mallarna bevarar namnen, använder `uppkoppling_db()` och `hamta_korrekt_vynamn(period, vy)`, kontrollerar faktiska kolumner, delar stora personurval i ID-block, stänger anslutningen med `on.exit()` och kräver inte Excel vid körning. Utdatamapp är konfigurerbar via `RUD_UTDATA`. De exporterar inte individdata automatiskt. Års-BAS och preliminär månads-BAS blandas inte.

Kopplingsmallen kräver en rad per person i varje uttag. Identiska dubblettrader får tas bort uttryckligen; andra dubbletter stoppar körningen. Händelseregister behöver en motiverad aggregering innan koppling. Ingen godtycklig ”första rad” väljs.

**Anpassade mallar är metadata- och syntaxkontrollerade genom tester, men har inte provkörts i MONA.** mikrodataR 0.1.0:s funktionsförteckning och tidigare användningsmönster finns i metodunderlaget; tillhandahållna Rd-filer beskriver argumenten men ingen MONA-miljö finns här. Kontrollera därför aktuell paketversion/signatur vid första körning. HREG- och migrationsmallarna kan inte få bekräftad årstillgänglighet från den här metadatafilen.

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
* `mikrodataR_description.txt` och tillhandahållna Rd-filer: dokumenterade signaturer, inte verifiering av installerat paket.
* [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/server)
* [Cloudflare Workers-gränser](https://developers.cloudflare.com/workers/platform/limits/)
* [Cloudflare remote MCP](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/)
* [ChatGPT anpassade MCP-anslutningar](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)
* [Claude Code MCP](https://code.claude.com/docs/en/mcp)

DeSO-skriptet och de två uttryckligen undantagna kodrepositorierna används inte. Servern beskriver denna beställning, inte alla SCB:s register. MIT-licens för projektets kod; metadata publiceras med beställarens uttryckliga tillstånd. Ingen SCB-anslutning eller officiell SCB-produkt görs gällande.

## Projektstöd och mallversion 1.1

Anropa `hamta_kodmall` med `mall: "projektstod"` för källprioritering, MONA-regler och de dokumenterade mikrodataR-signaturerna. Samma projektstöd ingår vid listning av register och kodmallar och när kod lämnas. Projektstödet använder de fyra ursprungliga verktygen. Version 0.4.0 kompletterar dem med tre verktyg för nyckelregistret. Klientens systeminstruktioner uppmanar den att läsa stödet innan kod skapas eller ändras.

Mallarna i `templates/*_v1.1.R` har versionsnummer, generell skapare och datum. De tidigare filerna ligger oförändrade i `templates/archive/*_v1.0.R`; de saknade ursprungligen versionsnummer och benämns initialversion 1.0 i arkivet. Genererad kod levereras i sin helhet och föreslår ett versionsmärkt filnamn. Vid ändring av användarens skript ska dess senaste version och skapare bevaras i stället för mallens uppgifter.

UTF-8-konvertering används vid textbearbetning. Identifierare ändras inte. Textnormalisering som ändrar kodning eller slår samman olika originalvärden stoppar för granskning. Numeriska mått och tidsfält konverteras med `numeriskt()` innan beräkning; tomma värden blir NA, dokumenterade bortfallskoder kan anges och oväntade värden stoppar. Dubblettreglerna är samlade i `unik()`.

Den aktuella projektfilen `mikrodatabasen_metadata.xlsx` har också jämförts: alla 4 138 poster och deras fem metadatafält är identiska med den publicerade snapshoten. Arbetsböckerna har olika filhash men samma metadata; därför behålls befintlig snapshot och dess SHA.

Se [kravgenomgången](docs/PROJECT_REVIEW.md). MCP-instruktioner hjälper klienten men garanterar inte att en AI alltid följer dem. R-kod behöver fortsatt granskas och provas i MONA.

</details>
