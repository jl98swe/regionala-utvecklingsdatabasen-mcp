# Version 0.4.0 – nyckelregister

Status: version för publicering, lokalt verifierad 2026-11-20.
Utgår från main acdd448; senare README-ändringar och den hopfällbara anslutningsguiden bevarade.

## Beteende

Tre nya verktyg kompletterar de fyra befintliga:

- sok_nycklar: sök kolumnstruktur och filnamn, med exakt kolumnfilter.
- hamta_nyckel: hämta kodvärden och klartext med sökning, kodurval och sidindelning.
- kontrollera_klartextkoppling: matcha datans kolumnnamn mot rubrikrader och visa
  möjliga tillkommande kolumner, överlapp samt dubbletter.

Underlaget är nycklar_2026-11-20.zip: 86 filer, 86 blad och 71 412 rader.
Originalfilerna ändras inte och originalarkivet ingår inte i serverpaketet.
Extraherat nyckelinnehåll, inklusive samtliga grupperingar och dubbletter,
ligger i data/keys.json. Källfilens SHA-256, arkivets SHA-256 och originalrad
bevaras. Anteckningar utan rubrik samt formler med sparade resultat redovisas
separat. Ingen nollutfyllnad eller normalisering av kodvärden görs.

## Begränsningar

Rubrikmatchningen är ett granskningsunderlag, inte en exakt simulering av
installerad fjoin_klartext. Kopplingsordning, kolumnkollisioner och transitiva
kopplingar behöver verifieras mot funktionens kod. Dubblettkontrollen använder
samtliga gemensamma rubriker som en möjlig sammansatt nyckel och ändrar inga rader.
Årstäckning för databasvariabler avgörs fortfarande av databasmetadata.
Snapshotdatum säger inte vilka analysår en klassifikation gäller.

## Verifiering

- TypeScript-typkontroll godkänd.
- 29 TypeScript-/MCP-tester godkända, inklusive alla sju verktyg med officiell SDK.
- Tre befintliga Python-importtester godkända.
- Worker-bygge godkänt: cirka 1,21 MiB gzip, inga nya bindings eller tjänster.
- Health och alla sju verktyg verifierade med officiell SDK över lokal HTTP mot
  Miniflare/workerd med det färdigbyggda Worker-paketet.
- Wrangler dev kunde inte starta på grund av miljöns uv_interface_addresses;
  runtimekontrollen genomfördes därför direkt med installerad Miniflare.
- Alla 71 412 importerade rader jämförda med Excel-cellernas sparade värden,
  och alla 86 filkontrollsummor verifierade.
- Återinbäddning av R-mallar gav oförändrad data/templates.json.
- Inga R-mallar eller befintliga R-skript ändrade; ingen körning i MONA.

## Publicering

Användaren har uttryckligen godkänt publicering av kod och hela nyckelinnehållet
i det publika GitHub-repot och uppdatering av MCP:n. Originalarbetsböckerna
publiceras inte. Offentlig verifiering dokumenteras efter driftsättningen.
