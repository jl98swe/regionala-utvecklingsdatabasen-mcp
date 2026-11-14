# Publicera på Cloudflare Workers Free

Servern är redan publicerad på `https://regionala-utvecklingsdatabasen-mcp.jl98swe.workers.dev/mcp`. Kontots workers.dev-subdomän är `jl98swe`. `wrangler.jsonc` pekar på det aktuella kontot; för en egen installation ändras eller tas `account_id` bort. Inga betalda tjänster har aktiverats av denna leverans. OAuth-anslutningen ger inte tillgång till faktureringsuppgifter, så eventuell befintlig betalplan kan inte verifieras här.

Första publiceringen gjordes via Cloudflare API med exakt byggd källkod från GitHub. Kontinuerlig publicering från GitHub är förberedd, men kräver att ägaren ansluter Cloudflare Builds (A) eller lägger in Actions-hemligheterna (B). GitHub-pushar kör tester automatiskt; de publicerar ännu inte nya Worker-versioner automatiskt.

## Alternativ A: via telefon eller webbläsare

1. Logga in på ditt Cloudflare-konto. Ett konto krävs; använd Free.
2. I Workers & Pages, skapa en Worker och importera det befintliga GitHub-repositoryt `jl98swe/regionala-utvecklingsdatabasen-mcp`.
3. Välj `main`, repositoryts rot, byggkommando `npm ci && npm run typecheck && npm test` och deploykommando `npx wrangler deploy`.
4. Behåll Worker-namnet `regionala-utvecklingsdatabasen-mcp`. Ingen databas, Durable Object, API-nyckel till MONA eller miljöhemlighet behövs i själva servern.
5. Publicera. Kopiera den verkliga `workers.dev`-adressen. Slutlig MCP-adress är den adressen med `/mcp`.
6. Skicka adressen till den som ska slutverifiera driften. Kontrollera `/health`, kör `npm run smoke -- <MCP-adressen>` och för in den verifierade adressen i README.

README:s Deploy to Cloudflare-knapp är ett alternativt startflöde. Den kan föreslå att skapa ett nytt repo; välj befintligt repo när gränssnittet tillåter det, eller använd ovanstående import så att uppdateringar fortsätter komma från rätt repository.

GitHub Actions verifierar varje push separat. Cloudflare Builds kan börja före GitHub-CI är klar; publicera bara en commit vars CI passerat. För ett strikt teststyrt publiceringsflöde används alternativ B.

## Alternativ B: GitHub Actions

Workflow `Deploy Cloudflare` är manuellt och kör egna tester innan publicering. Lägg till följande i GitHub → Settings → Secrets and variables → Actions:

* Secret `CLOUDFLARE_API_TOKEN`: Cloudflare-token för Workers-redigering på det valda kontot.
* Secret `CLOUDFLARE_ACCOUNT_ID`: valt Cloudflare-konto.

Token ska aldrig skrivas i en chatt, README eller källkod. Starta sedan workflowet från Actions på `main`. Cloudflare kan kräva att kontots Workers-subdomän aktiveras första gången i dashboarden.

Efter lyckad publicering kör workflowet SDK-klientens smoke-test mot `deployment-url` plus `/mcp` och skriver adressen i körningens sammanfattning. Om URL saknas stoppar kontrollen; ingen adress gissas.

## Alternativ C: lokal CLI

```bash
npm ci
npx wrangler login
npm run typecheck
npm test
npm run deploy
npm run smoke -- https://DIN-FAKTISKA-WORKER-ADRESS/mcp
```

## Kapacitet och övervakning

Free-planens CPU-gräns är snäv. Mät vanliga anrop och de största tillåtna urvalen i Cloudflares mätvärden. Om CPU-taket överskrids ska svarsstorlek/sökindex optimeras och testas innan gratis drift utlovas. Servern begränsar request body till 64 KiB och har gränser för antal urval, perioder och sidstorlek. Detta ersätter inte leverantörens kapacitetsgränser.

Worker-observability är avstängd i konfigurationen. Servern loggar inte frågor. Cloudflare kan behandla nätverksmetadata enligt sina villkor. Skicka aldrig mikrodata eller personuppgifter till verktygen; endast variabelnamn, vyer och perioder behövs. Servern hämtar inte anropares filer eller URL:er och saknar alla MONA-hemligheter.

## Återställning

Återställ till föregående Worker-version i Cloudflare eller återställ relevant Git-commit och publicera på nytt. Klienterna använder samma `/mcp`-adress. Metadata-SHA i svaren gör versionsbyten spårbara.
