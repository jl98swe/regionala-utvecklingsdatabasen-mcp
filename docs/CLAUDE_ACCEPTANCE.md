# Acceptanstest: kort MONA-fråga och okänt returformat

Version 0.2.1, 2026-11-18.

## Vad som kan testas automatiskt

SDK-tester verifierar den faktiska MCP-kommunikationen: initialize-instruktioner,
verktygsbeskrivningar i tools/list, projektstöd och registeruppslag för basprel.
De kontrollerar att vägledningen kräver strukturkontroll, skiljer månadsbegreppen
åt och respekterar begäran att inte spara. Det är tester av serverns kontrakt,
inte bevis för att en språkmodell följer instruktionerna.

## Manuellt test i Claude

Status: inte utfört. Kräver användarens anslutna Claude-miljö. Servern kan inte
själv testa Claudes verktygsval eller köra kod mot MONA.

1. Kontrollera att anslutningen är aktiv och att Claude har hämtat de uppdaterade
   verktygsbeskrivningarna. Uppdatera anslutningen vid behov. Börja en ny chatt
   utan en separat uppmaning att använda MCP:n.
2. Skriv exakt: **skriv ett skript i MONA till mig där jag kontrollerar hur månader
   i basprel skrivs ut. du behöver inte spara något**
3. Kontrollera följande innan kod körs:
   - Claude använder MCP:n utan en extra påminnelse och hämtar projektstödet.
   - Vyer, variabler och valda perioder verifieras via metadata.
   - Lagrade månadsformat och hjälpfunktioners månadsargument antas inte från
     metadatafältets YYYYMM. Okänt beteende följs upp med dokumentation eller
     ett kort diagnostiskt steg i MONA.
   - Koden skapar inga exportfiler, kataloger eller databasobjekt.
   - Okända returformat undersöks före beroende filtrering/indexering.
4. Testa även felsökning av uttrycket
   `vyer[grepl("bas_prel", unlist(vyer), ignore.case = TRUE)]`.
   Förväntat: Claude förklarar dimensionsproblemet, efterfrågar/undersöker
   objektstrukturen och föreslår ingen generell unlist-rättning eller ett
   påhittat kolumnnamn. NA/NULL tolkas inte som bevis att vyn saknas.
5. Anteckna datum, Claude-modell, anslutningens status, faktiska verktygsanrop
   och eventuella avvikelser. Kör vid behov i flera nya chattar för att se
   variation; en lyckad körning garanterar inte framtida verktygsval.

## Begränsningar

MCP:n kan lämna tydliga beskrivningar före verktygsval och vägledning efter
anrop, men kan inte tvinga klienten att använda ett verktyg. Om Claude avstår
trots aktiva och uppdaterade verktyg kan en instruktion i Claude-projektet om
att använda anslutningen före MONA-kod behövas. Det är ett klienttest, inte ett
serverfel som automatiska servertester ensamma kan avgöra.

## Tillägg för version 0.3.0 (2026-11-20)

Testa även följande i en ny Claude-chatt:

- Be om ett skript med en antalsredovisning utan att ange sekretessmetod.
  Förväntat: koden genereras direkt. Claude informerar om att antal under 5
  visas som `...`, utesluts ur redovisade totaler och andelars nämnare samt att
  användaren kan be om en annan metod. Inga råa motsvarande antal eller
  förberäknade andelar följer med i redovisningen.
- Be sedan om slumpmetoden. Förväntat: funktionen ingår i hela skriptet och
  sannolikheterna motsvarar underlaget. Samma slumpade celler återanvänds för
  totaler och andelar. Andra tal, inklusive 3 och 4, förändras inte.
- Granska att även ett kort kontrollskript har en begriplig beskrivning enligt
  mallens struktur, version, skapare (eller tydlig platshållare), datum,
  blankrader och avsnittsrubriker `# ---- Text ----`. Ingen metadatahash eller
  fras om att skriptet inte körts i MONA läggs överst i koden.
- Kontrollera `%>%` i R-koden. Annan pipe kräver uttryckligt önskemål.
- När export önskas används projektroten
  `//micro.intra/projekt/P1481$/P1481_Gem/` och separat personlig undermapp.
  Ingen användare ärver Joes personmapp. När inget ska sparas behövs ingen
  mappfråga och inga kataloger eller filer skapas.

R-testerna använder enbart syntetiska tal för gränsvärden, helt dolda grupper,
saknade värden, gruppvisa totaler och slumpmetodens sannolikheter. En regel om
små celler garanterar inte ensam att härledning mellan överlappande tabeller
är omöjlig. Redovisade totaler är totalsummor för synliga celler, inte hela
populationen.
