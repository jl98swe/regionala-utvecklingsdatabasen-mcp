# Registerkunskap och metodstöd

Kunskapen ligger i data/register-knowledge.json och används av src/knowledge.ts.
Den ändrar inte data/metadata.json, nyckelfilerna eller individdata. De sju
befintliga verktygen används; ingen ny anslutning behövs.

## Lägg till en registeranmärkning

1. Kontrollera vy och berörda variabler mot beställningens senaste metadata.
2. Kontrollera definitioner och historik i SCB:s Mikrometadata. Om tjänsten
   inte kan läsas används SCB:s officiella dokumentation med angiven källa.
3. Ange ett stabilt id, vyer, variabler, budskap, analyskonsekvens, källa,
   sida, dokumentationens omfattning och granskningsdatum.
4. Ange om åren gäller registerårgång eller händelseår. Blanda inte dessa.
   För uppföljningsår behövs en uttrycklig koppling till källans årsbegrepp.
5. Markera separat om SCB-källan är verifierad och om tillämpningen på just
   beställningen är verifierad. En LISA-definition bevisar inte att en vy i
   en annan produkt har samma historik, även om variabelnamnet är identiskt.
6. Lägg till tester vid brytpunkten, före/efter den, över den, utan år och
   med fel/okänt årsbegrepp. Kontrollera att andra variabler inte får en
   ogrundad varning och att tillgängligheten aldrig skrivs om.

Anmärkningar följer med via register_context i sökning, registerstruktur,
tillgänglighetskontroll och tillämpliga kodmallar. Korta bakgrundsuppgifter
finns kvar även när ett precist tidsvillkor inte kan utvärderas. När åren
berör begränsningen markeras den tydligare; vid okänt årsbegrepp krävs
förtydligande innan AI:n drar en årsspecifik slutsats. Skriptinledningen får
relevanta anmärkningar med källor. Inga rader eller personer filtreras bort.

De första anmärkningarna avser två separata tidsfrågor och migrationstabellens
händelsekaraktär. Tillämpningen på beställningen är markerad som osäker.
De innehåller ingen generell historisk startgräns 1968.

## Lägg till en variabelkoppling

Ange begrepp, gemensamt analysnamn och exakt källvariabel för varje
årsintervall. Kontrollera varje variabel och nyckel mot metadata. Dokumentera
om definition, enhet och kodning är jämförbara och vem som styrker detta.
Namnlikhet, borttagna diakritiska tecken eller samma kodlista är inte bevis.

Årsplanen verifieras på nytt vid varje generering. Luckor, överlapp eller
saknade år blockerar just harmoniseringsmallen. Ingen alternativ variabel
väljs genom gissning. Den första namnkopplingen gäller avggymn. Metadata verifierar originalnamn
och årsintervall, men inte att definition, enhet och kodning är jämförbara.
Varje sådan kontroll har en separat status. Den genererade koden stoppar
före uttagen tills jämförbarheten har kontrollerats och markerats i skriptet.
Konvertering till numerik sker i uttaget före vidare beräkningar. Tomma
värden hanteras, men särskilda bortfallskoder måste verifieras uttryckligen.
Uttagsår bevaras och identifierare konverteras inte till tal.

## Generella metodregler

Projektstödet omfattar alla register. Det skiljer årskullar och fasta
referenstidpunkter från månadsövergångar, terminers registreringar och
händelseförlopp. Luckor och ofullständig uppföljning måste hanteras.

Analysenheten bestäms före koppling: person, person/år, person/termin,
person/månad eller händelse. Användaren väljer hur flera giltiga händelser
ska behandlas. Den generella mallen förutsätter en rad per person och
stoppar när dess krav inte är uppfyllt; den ersätter inte en händelseanalys.
Koden får anpassas för annan analysenhet efter uttryckligt metodval.

För antal bosatta med en egenskap används relevant befolkning vid vald
tidpunkt som population. En registrerad händelse är inte ett generellt
krav på att räknas som utrikes född. Första observerade händelse får inte
utan dokumenterad täckning tolkas som första händelse i livet.
