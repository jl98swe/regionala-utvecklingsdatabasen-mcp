import api from '../data/mikrodataR-api.json' with {type:'json'};
export const projectSupport = {
 version:'1.3',
 source_priority:['Beställningens aktuella metadata: exakta vyer, variabler och variabelns egna år/månader.','Tillhandahållen mikrodataR-dokumentation: funktioner och argument.','SCB Mikrometadata: definitioner och innehåll.','Befintliga MONA-skript: struktur, metod och tidigare beslut.','Tidigare chattar/minne: endast bakgrund.'],
 definitions_url:'https://mikrometadata.scb.se/',
 usage_scope:'Använd denna MCP före förslag på R-kod för MONA och Regionala utvecklingsdatabasen, även korta kontrollskript, felsökning, basprel/BAS preliminär månadsstatistik och frågor om hur månader skrivs ut. Användaren behöver inte nämna MCP. Begäran att inte spara något gäller filskrivning och export; metadata ska fortfarande kontrolleras.',
 troubleshooting:{
  unknown_return_format:[
   'Rd anger inte alltid returformat. Börja då med class(objekt), str(objekt) och vid behov names(objekt) i MONA. Härled inte format från funktionsnamnet.',
   'Vid data.frame/tibble: verifiera kolumnen som innehåller vynamn och filtrera rader med den kolumnen. Vid lista: verifiera vilket element som innehåller namnen. Vid character-vektor: filtrera samma vektor som genomsöks.',
   'Använd inte unlist() som generell rättning: det kan blanda vynamn, år och andra kolumner. En logisk indexvektor måste avse samma objekt och dimension som filtreras. Kontrollera längd och NA; NA/NULL i ett felsvar bevisar inte att registret saknas.',
   'Om struktur saknas: ge ett kort diagnostiskt steg och invänta utskriften innan kod som beror på formatet skrivs. Gissa inte kolumnnamn eller välj första kolumnen godtyckligt.'
  ],
  monthly_values:[
   'Sök basprel i sok_variabler, använd exakt logiskt vynamn från svaret och hämta variablerna med hamta_registerstruktur. Förkontrollera varje vald variabel och period med kontrollera_tillganglighet.',
   'Skilj metadatafältets perioder (YYYYMM), argumentet till hamta_korrekt_vynamn() och de faktiska lagrade tidsvärdena. Metadata bevisar inte hur månader skrivs ut i MONA eller hur mikrodataR tolkar månadsargument.',
   'Kontrollera mikrodataR-signaturerna. Om periodargumentets månadsbeteende är odokumenterat: kontrollera installerad hjälp eller funktion i MONA innan månadsberoende tbl() skapas; anta inte att YYYYMM accepteras.',
   'Undersök en verifierad tidsvariabel med ett begränsat uttag av distinkta originalvärden i MONA. Om ingen tidsvariabel finns i metadata: säg det och undersök den dokumenterade vy-/periodhanteringen; hitta inte på Manad eller ArManad.',
   'Bevara character-värden och inledande nollor vid formatkontroll. Konvertera först i ett separat beräkningsflöde om numerisk sortering eller beräkning behövs. Skilj observationer från antaganden.',
   'När inget ska sparas: visa kod i chatten och resultat i konsolen. Skapa inga kataloger, exportfiler eller databasobjekt i kontrollskriptet.'
  ]
 },
 small_counts:{
  default_method:'under_5',threshold:5,marker:'...',blocks_generation:false,
  user_notice:'Som standard visas antal under 5 som ... och räknas inte med i redovisade totaler eller andelarnas nämnare. Totalen kan därför vara lägre än det faktiska antalet. Du kan be om en annan gräns eller metod.',
  alternative:'slump_0_3: 1 blir 0 med sannolikhet 2/3 och 3 med 1/3; 2 blir 0 med 1/3 och 3 med 2/3. Övriga antal och NA behålls. Bädda in hela random_0_till_3-funktionen; förutsätt inte att användaren har den.',
  rules:[
   'Generera skript direkt med under_5 som standard. Kräv inte val av sekretessmetod eller separat godkännande för att skapa koden. Användaren kan uttryckligen be om en ändring.',
   'Regeln gäller aggregerade antal, inte alla numeriska värden, årtal, nycklar eller individdata i den interna bearbetningen. Med gränsen 5 döljs även nollor enligt regeln antal < 5; NA är fortsatt okänd uppgift.',
   'Bygg redovisade totaler och andelar av samma kvarvarande antalsceller, inte av den ursprungliga totalen. Visa ... även för andelar som hör till dolda antal. Helt dolda grupper får dold total och andel, inte noll.',
   'Skydda även kontrolltabeller och konsolutskrifter. Exportera inte råa antal, förberäknade andelar eller andra hjälpkolumner som kan återge de dolda talen. Behåll rådata enbart internt i MONA.',
   'För medelvärden och andra mått används gruppens underliggande antal för döljning. Ta inte bort rader före analysen; skydda först redovisningen. Överlappande grupper eller flera tabeller kan fortfarande möjliggöra härledning; hävda inte att denna standard ensam garanterar röjandeskydd.',
   'Slumpmetoden är ett uttryckligt alternativ, aldrig standard. Slumpa färdiga antalsceller en gång och återanvänd samma resultat för tabeller, totaler och andelar. Informera om att enskilda utfall och totaler kan avvika; väntevärdet för ettor och tvåor bevaras.'
  ]
 },
 script_style:{
  pipe:'%>%',
  header_sections:['Beskrivning och syfte','Register som används','Tillvägagångssätt','Noteringar','Skript av','Version','Skapad','Senast uppdaterad'],
  project_root:'//micro.intra/projekt/P1481$/P1481_Gem/',
  personal_folder:'Anges separat relativt projektroten. region_norrbotten/joe/utdata är Joes utdata, aldrig en generell standard. Personliga mappar används normalt även för skript; anta inte att getwd() eller en relativ utdata-mapp är rätt.',
  rules:[
   'Följ mallens utförliga intro med konkret syfte, register, tillvägagångssätt och relevanta noteringar, sedan skapare, version och datum. Detta gäller även korta felsökningsskript. Om skapare är okänd: skriv Ej angiven – fyll i namn och leverera koden ändå; tillskriv inte användaren eller MCP:n författarskap.',
   'Inled med den mänskliga beskrivningen. Metadata-SHA hör hemma i verktygssvarets metadata_sha256, inte som en kryptisk första kodrad. Lägg inte in Ej körd i MONA i skriptets intro. Behåll verifieringsstatus saklig i verktygssvaret och beskriv bara relevanta begränsningar för användaren.',
   'Använd %>% i all R-kod. Annan pipe, inklusive |>, kräver att användaren uttryckligen har angett det. Skriv ett pipe-steg per rad, normal indragning och blankrader före nya avsnitt.',
   'Markera avsnitt med # ---- Text ----. Bevara redan tydliga avsnittsrubriker i befintliga skript. Kommentera väsentliga metodval och fallgropar, inte varje självklar rad.',
   'Ange projektroten och den personliga undermappen separat i inställningarna. Använd inte Joes personmapp för andra. Saknas personmapp ska ingen export köras förrän den fyllts i; själva skriptgenereringen fortsätter. När inget ska sparas behövs ingen mappfråga, katalogskapning eller exportkod.'
  ]
 },
 rules:[
  'Använd endast verifierade logiska vynamn och variabelnamn. Redovisa saknade namn och sök alternativ som faktiskt finns. Kontrollera varje variabel för samtliga analysår, även före och efter kohortåret.',
  'Tomt år betyder okänd tillgänglighet. Vyns år och alla_ar/forsta_ar/senaste_ar bevisar inte en enskild variabels tillgänglighet.',
  'Metadata är granskningsunderlag, aldrig ett körningsberoende för R-koden. Bädda in verifierade krav och metadata-SHA.',
  'Använd mikrodataR när funktionen täcker behovet: uppkoppling_db, hamta_korrekt_vynamn före tbl, årsfunktioner vid dynamiska år, hamta_vylista/hamta_variabler/sok_variabler vid utforskning, fjoin_klartext vid klartextkoppling. Se dokumenterade signaturer. Om installerat paket avviker: kontrollera args() och packageVersion("mikrodataR") innan ändring.',
  'Vid okänt returformat från mikrodataR: kontrollera class(), str() och names() före filtrering eller indexering. Gissa inte kolumnnamn. Använd inte unlist() som generell rättning eller index från ett omformat objekt på originalobjektet. Följ troubleshooting i projektstödet.',
  'Vid månadsfrågor: skilj metadatafältets YYYYMM från faktiska tidsvärden och hjälpfunktionernas periodargument. Verifiera varje del; gissa inte månadsvariabel eller odokumenterat månadsbeteende. När inget ska sparas, visa endast kod och konsolresultat utan filskrivning.',
  'Alla MONA-variabler är character. Konvertera mått och tidsfält uttryckligen till numeriskt i samma dataflöde FÖRE berörd sortering, filtrering, beräkning och aggregering. Hantera tomma värden och dokumenterade bortfallskoder; gissa inte koder.',
  'Använd iconv(x, from = "", to = "UTF-8", sub = "byte") när text ska bearbetas. Konvertera inte alla kolumner rutinmässigt. Bevara identifierare/kopplingsnycklar och original vid felsökning. Kontrollera att normalisering inte slår samman olika grupper; åäö ska bevaras.',
  'Samla dubblettregler i namngiven funktion. Ange nyckel, analysenhet, vilken hel rad som behålls och hur prioriteringen ändras. Identiska rader kan tas bort uttryckligen; motstridiga dubbletter stoppar standardmallen. Ingen godtycklig första rad eller kolumnvis sammansättning.',
  'Vid ändring: bevara struktur, relevanta kommentarer, inställningar och metodbeslut; gör minsta ändring. Leverera hela skriptet som separat version och behåll föregående. Filnamn v1.0/v1.1/v2.0 och intro med version, skapare, skapandedatum och uppdateringsdatum. Höj från senaste befintliga version; mindre rättning decimal, ändrat syfte/metod/struktur huvudversion. Om skapare är okänd: använd tydlig platshållare och leverera skriptet ändå, hitta inte på.',
  'Skilj registrerade studenter, avklarade poäng, studieavslut och examen. ltu_examen gäller endast examen och kan inte ersätta LTU-uppföljning av registrerade. Invandringsmallen är också en avgränsad delmall; välj metod uttryckligen.',
  'Följ script_style och small_counts i projektstödet: utförligt intro, tydliga avsnitt, %>% som pipe och under_5 som standard utan att blockera generering.',
  'Redovisa antaganden, möjliga motargument, okända definitioner och kontrollbehov. Skilj metadata-/syntaxkontroll från faktisk MONA-körning. Servern kan aldrig ansluta till MONA eller köra R/SQL.'
 ],
 mikrodataR:api,
 documentation_caveats:['Rd beskriver inte alla returformat eller månads-/NULL-beteenden. Anta inte dessa utan kontroll i MONA.','fjoin_klartext har ett argumentlöst exempel som avviker från usage med tab. Följ usage och kontrollera installerad version. Kodlistors betydelse måste verifieras.'],
 template_version:'1.2',mona_execution:'not_run'
};
export const serverInstructions = projectSupport.small_counts.user_notice+' '+projectSupport.script_style.rules.join(' ')+' '+projectSupport.small_counts.rules.join(' ')+' '+projectSupport.usage_scope+' Använd projektstödet i hamta_kodmall(mall="projektstod") innan R-kod skapas eller ändras. '+projectSupport.rules.join(' ')+ ' Källprioritering: metadata, mikrodataR-dokumentation, https://mikrometadata.scb.se/, befintliga skript, tidigare chattar. Ange metadata_sha256 med kod. Alla användare delar samma metadata; användarens privata filer ändrar inte servern.';
