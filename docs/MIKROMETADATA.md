# Värdemängder från SCB

Pilotregister: **Aktieägarstatistik**. Källan är https://mikrometadata.scb.se/.
Ingen anslutning till MONA eller hämtning av mikrodata görs.

`Hämta värdemängder från SCB` körs första dagen varje månad kl. 04:17 UTC
(05:17 svensk vintertid, 06:17 sommartid). Den kan även startas manuellt.

Skriptet använder webbplatsens egna CSV-exporter via Chromium/Playwright.
CSV-filerna är i praktiken UTF-8 med tabulator. Alla koder förblir strängar,
även tom kod och inledande nollor. Ingen kod väljs bort eller slås ihop.

## JSON och MCP

`data/value-domains.json` innehåller separata värdemängder (`domains`) och
kopplingar (`bindings`) till register, registervariant, kolumn, variabeldefinition
och den faktiskt valda registerversionen. Identiska värdemängder delar ett
innehållsbaserat SHA-256-id. Årsknapparna på webbplatsen styr vilka versioner
som hämtas; första/sista år används inte för att anta en obruten serie.
Definitioner utan exporterbar lista sparas som `not_enumerated`, med datatyp
och värdemängdsnamn. Det betyder inte bortfall i MONA.

MCP-verktygen `sok_vardemangder` och `hamta_vardemangd` läser JSON direkt,
med sidindelning och exakt kodurval. De kopplar inte automatiskt SCB:s register
eller kolumner till logiska MONA-vyer. Databasmetadata styr fortfarande vilka
variabler och år som finns i beställningen. Sökresultatet visar pilotens
fullständighetsstatus och eventuella fel. Tom katalog innebär ingen importerad
information, inte att värdemängder saknas hos SCB.

## Uppdatering och återstart

Första körningen hämtar alla tillgängliga versioner för pilotens variabler.
Varje lyckad variabel/version skrivs atomärt till JSON. Vid fel behålls tidigare
lyckade uppgifter, körningen markeras felaktig och återstart fortsätter från
sparade kopplingar. Workflow sparar även en checkpoint som artifact.

När SCB:s synliga uppdateringsdatum är oförändrat och piloten är komplett görs
ingen ny export. Vid ändrat datum kompletteras saknade versioner och senaste
versionen per variabel kontrolleras på nytt. Äldre versioner ligger kvar med
sitt ursprungliga hämtningsdatum. Det bygger på att SCB:s uppdateringsdatum är
tillförlitligt. Historiska rättelser kräver manuell `refresh_history=true`.

Data committas till main. En lyckad hämtkörning startar befintligt Deploy
Cloudflare-workflow, som testar och publicerar MCP-servern med den uppdaterade
katalogen om Actions-hemligheterna CLOUDFLARE_API_TOKEN och CLOUDFLARE_ACCOUNT_ID
finns. Annars sparas datan men publiceringen hoppas över med ett tydligt meddelande. Hämtningen startar även vid ändrad hämtkod. Ingen separat löpande
kostnadstjänst behövs.

## Lokal körning

```sh
pip install -r scripts/requirements-mikrometadata.txt
python -m playwright install chromium
python scripts/harvest_mikrometadata.py --register 'Aktieägarstatistik'
```

`--max-checks 3` gör ett kort återstartbart test. `--refresh-history` läser om
även redan hämtade historiska kopplingar. Fel stoppar hämtningen; ingen automatisk
kringgång av spärrar eller godtycklig ersättning av felaktiga exporter görs.

## Beställningsstyrd hämtning (0.7)

`data/order-source-review.json` innehåller granskade registerval. Kopplingarna
bygger på registerbeteckning och kolumnprofil, med exakta eller entydiga
skiftlägesmatchningar. Dessa är kopplingar till koddefinitioner, inte bevis för
beställningens population. Namn som inte kan beläggas lämnas öppna.
`data/order-source-plan.json` visar varje beställd variabel, källträff och årsfält.
`data/order-source-candidates.json` innehåller sökförslag; de är inte godkännanden.

LISA individer använder både varianten 16 år och äldre (äldre årgångar) och
15 år och äldre (nyare årgångar). Den faktiskt tillgängliga SCB-versionen jämförs
med variabelns eget årsfält. Okända beställningsår förblir okända. För sådana
variabler kan dokumentation hämtas för fler SCB-versioner, uttryckligen utan
att påstå att beställningen innehåller de åren. Identifierarkolumner listas
separat och ger inga uttag av person- eller företagsuppgifter.

Den månatliga inventeringen startar den första dagen kl. 03:17 UTC och följs av
workflowet **Hämta beställningens värdemängder**. Varje batch väljer högst åtta
källvarianter, med högst två samtidiga webbläsare och 200 nya variabelversioner
per jobb. Senaste relevanta versionen för varje variabel prioriteras före äldre
historik. Kön återstartar automatiskt, med en gräns på 13 batcher per start.
Kvarvarande arbete kan återstartas manuellt eller vid nästa månatliga körning.
Grupper med faktiska fel spärras för samma hämtkod och källa medan andra fortsätter.
Ändrad hämtkod eller källa gör dem åter körbara. Redan sparade värden behålls.

Kodlistornas innehåll lagras en gång per innehållshash under
`data/value-domain-values/`. Kopplingar och status per registervariant ligger
under `data/value-domains-ordered/`. MCP:n läser en fast katalog av dessa publika
GitHub-filer vid behov; den bäddar inte in hela den växande mängden kodvärden.
Den accepterar inga användarvalda adresser. Katalogdelar och kodlistor har
storleksgräns, tidsgräns och en minnesbegränsad cache med två minuters giltighet.

Ange exempelvis `databasvy="lisa_individ"` eller `databasvy="rtb"` i
`sok_vardemangder`. Svaret redovisar även väntande och felande hämtningar samt
olösta variabler. `hamta_vardemangd` följer exakt id från sökningen och hämtar
endast den berörda kodlistan. Värdemängdshämtningen ger aldrig nya garantier om
vilka variabler, år eller observationer som finns i MONA.

Den fullständiga SCB-indexexporten bevaras komprimerad. CSV-exporten innehåller
även poster utan kolumnnamn och några ofullständiga poster; de används inte som
kolumnträffar. Skillnaden mellan gränssnittets och exportens radantal dokumenteras,
och inga saknade kolumnnamn fylls i genom antaganden.


### Definitioner, population och metodfält

Den beställningsstyrda hämtningen sparar även den synliga beskrivningstabellen
för varje faktisk registerversion. Variabeldefinition, variabelbeskrivning,
måttenhet, källa, populationsdefinition, registersyfte och mätinformation följer
med när SCB tillhandahåller dem. Ingen fullständig metodbeskrivning antas finnas.
Externa metodrapporter och PDF-filer laddas inte automatiskt ned.

Originalfältnamn, upprepade fält och tomma värden bevaras i en ordnad lista under
`data/variable-documentation/`. En innehållsbaserad referens knyter dokumentet
till samma registervariant, kolumn och registerversion som kodlistan. Tidigare
hämtade poster kompletteras successivt; en tom eller ännu inte hämtad definition
ska inte tolkas som att SCB saknar dokumentation. `hamta_vardemangd` returnerar
`documentation.status` och insamlade originalfält. Källans populationsbeskrivning
ändrar inte populationen i MONA-beställningen.


### Godkända antaganden och tidigare förklarad årshantering

`view_notes` i värdemängdssökningen och uppslaget visar användarens godkända
antaganden för äldre FEK-definitioner: MedeltalAnstallda 1998–2002 och
SysselsattaRAMS 2002, med definitionerna från SCB:s dokumentation från 2003
som referens. Antagandena returneras även när sökt registerårgång inte finns
i SCB-katalogen. Inga källversioner eller historiska kodlistor skapas.

Användarens förklaringar för fodelseuppg och in_utvandring_lisa samt hänvisningen
till tidigare HREG-metodskript visas separat. De ändrar inte tomma årsfält till
påhittade tillgängliga år. Underlaget i tidigare HREG-skript ska läsas innan
metoden återges eller ändras.
