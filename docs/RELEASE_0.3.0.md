# Version 0.3.0

Datum: 2026-11-20. R-mallar: 1.2. Projektstöd: 1.3.

## Beteende

- Verktygsbeskrivningar omfattar korta MONA-frågor och felsökning utan export.
- Okända mikrodataR-returformat ska undersökas före formatberoende kod.
- Metadatafältets månadsperioder skiljs från lagrade värden och API-argument.
- Aggregerade antal under 5 visas som `...` som standard och utesluts ur
  redovisade totaler och andelarnas nämnare. Tillhörande andelar döljs också.
  Regeln omfattar även nollor. Okända antal är inte nollor. Helt dolda grupper
  får dold total. Skriptgenereringen kräver inget separat metodval.
- Slumpning av 1 och 2 till 0 eller 3 är ett uttryckligt alternativ. Den egna
  funktionen ingår i mallen och samma slumpade celler återanvänds i totaler.
- Intro följer referensens beskrivning, register, tillvägagångssätt, noteringar,
  skapare, version och datum. Okänd skapare får en platshållare. Metadatahash
  ligger i verktygssvaret. Skriptet använder `%>%` och tydliga avsnitt.
- Projektroten är gemensam; personlig undermapp är en separat inställning.
  Ingen generell mall använder Joes mapp och ingen katalog skapas automatiskt.
- Tidigare mallversioner finns kvar under templates/archive.

## Genomförda kontroller

- TypeScript: typkontroll och 25 tester passerar, inklusive riktiga MCP-SDK-
  anrop till Worker-handlern, instruktioner och genererade skript.
- Python: tre tester passerar.
- Wrangler: minifierat Worker-paket byggt med dry-run.
- R 4.6.0 via WebR, dplyr 1.2.1: syntax för samtliga tre mallar och tre
  genererade skript samt alla tester i tests/r-checks.R passerar.
- R-testerna täcker dubbletter, nycklar, textkodning, numerisk ordning,
  små antal, gränsvärden, gruppvisa totaler, NA, tomma tabeller och slumpning.
  All testdata är syntetisk. Ingen databasanslutning används i testerna.
- Den tillhandahållna Excel-filens logiska metadatarader jämfördes med
  serverns katalog: identiska. Katalogen ändrades därför inte.

## Kvarstående verifiering

Publicerad på GitHub main och Cloudflare 2026-11-20.
Källcommit: 0f2e5a2181efdd92ad71ce2edf035be986615916.
GitHub CI 44742947872: samtliga kontroller passerade, inklusive R och HTTP.
Cloudflare deployment: 35c859d2e8b24c42b03dbbf09317ad98.
Worker-paketets SHA-256: d341450be0cb345520ecda84fa888db39e72814e000f1863c28873ba24d3323f.
Publik health-route visar server 0.3.0 och mallar 1.2. Officiell MCP-SDK-klient
har verifierat initialize, tools/list, projektstöd 1.3 och alla fyra verktyg
via Streamable HTTP mot den publicerade adressen.

Manuell verifiering av Claudes eget verktygsval återstår enligt
/docs/CLAUDE_ACCEPTANCE.md. Serverns funktion och publicering är verifierade.
