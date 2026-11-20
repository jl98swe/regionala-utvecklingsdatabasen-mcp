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

Data committas till main. MCP-servern behöver därefter publiceras med befintligt
Deploy Cloudflare-workflow för att den uppdaterade katalogen ska bli tillgänglig
på den publika endpointen. Ingen separat löpande kostnadstjänst behövs.

## Lokal körning

```sh
pip install -r scripts/requirements-mikrometadata.txt
python -m playwright install chromium
python scripts/harvest_mikrometadata.py --register 'Aktieägarstatistik'
```

`--max-checks 3` gör ett kort återstartbart test. `--refresh-history` läser om
även redan hämtade historiska kopplingar. Fel stoppar hämtningen; ingen automatisk
kringgång av spärrar eller godtycklig ersättning av felaktiga exporter görs.
