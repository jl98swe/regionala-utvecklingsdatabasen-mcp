import api from '../data/mikrodataR-api.json' with {type:'json'};
export const projectSupport = {
 version:'1.1',
 source_priority:['Beställningens aktuella metadata: exakta vyer, variabler och variabelns egna år/månader.','Tillhandahållen mikrodataR-dokumentation: funktioner och argument.','SCB Mikrometadata: definitioner och innehåll.','Befintliga MONA-skript: struktur, metod och tidigare beslut.','Tidigare chattar/minne: endast bakgrund.'],
 definitions_url:'https://mikrometadata.scb.se/',
 rules:[
  'Använd endast verifierade logiska vynamn och variabelnamn. Redovisa saknade namn och sök alternativ som faktiskt finns. Kontrollera varje variabel för samtliga analysår, även före och efter kohortåret.',
  'Tomt år betyder okänd tillgänglighet. Vyns år och alla_ar/forsta_ar/senaste_ar bevisar inte en enskild variabels tillgänglighet.',
  'Metadata är granskningsunderlag, aldrig ett körningsberoende för R-koden. Bädda in verifierade krav och metadata-SHA.',
  'Använd mikrodataR när funktionen täcker behovet: uppkoppling_db, hamta_korrekt_vynamn före tbl, årsfunktioner vid dynamiska år, hamta_vylista/hamta_variabler/sok_variabler vid utforskning, fjoin_klartext vid klartextkoppling. Se dokumenterade signaturer. Om installerat paket avviker: kontrollera args() och packageVersion("mikrodataR") innan ändring.',
  'Alla MONA-variabler är character. Konvertera mått och tidsfält uttryckligen till numeriskt i samma dataflöde FÖRE berörd sortering, filtrering, beräkning och aggregering. Hantera tomma värden och dokumenterade bortfallskoder; gissa inte koder.',
  'Använd iconv(x, from = "", to = "UTF-8", sub = "byte") när text ska bearbetas. Konvertera inte alla kolumner rutinmässigt. Bevara identifierare/kopplingsnycklar och original vid felsökning. Kontrollera att normalisering inte slår samman olika grupper; åäö ska bevaras.',
  'Samla dubblettregler i namngiven funktion. Ange nyckel, analysenhet, vilken hel rad som behålls och hur prioriteringen ändras. Identiska rader kan tas bort uttryckligen; motstridiga dubbletter stoppar standardmallen. Ingen godtycklig första rad eller kolumnvis sammansättning.',
  'Vid ändring: bevara struktur, relevanta kommentarer, inställningar och metodbeslut; gör minsta ändring. Leverera hela skriptet som separat version och behåll föregående. Filnamn v1.0/v1.1/v2.0 och intro med version, skapare, skapandedatum och uppdateringsdatum. Höj från senaste befintliga version; mindre rättning decimal, ändrat syfte/metod/struktur huvudversion. Fråga efter skapare om okänd, hitta inte på.',
  'Skilj registrerade studenter, avklarade poäng, studieavslut och examen. ltu_examen gäller endast examen och kan inte ersätta LTU-uppföljning av registrerade. Invandringsmallen är också en avgränsad delmall; välj metod uttryckligen.',
  'Redovisa antaganden, möjliga motargument, okända definitioner och kontrollbehov. Skilj metadata-/syntaxkontroll från faktisk MONA-körning. Servern kan aldrig ansluta till MONA eller köra R/SQL.'
 ],
 mikrodataR:api,
 documentation_caveats:['Rd beskriver inte alla returformat eller månads-/NULL-beteenden. Anta inte dessa utan kontroll i MONA.','fjoin_klartext har ett argumentlöst exempel som avviker från usage med tab. Följ usage och kontrollera installerad version. Kodlistors betydelse måste verifieras.'],
 template_version:'1.1',mona_execution:'not_run'
};
export const serverInstructions = 'Använd projektstödet i hamta_kodmall(mall="projektstod") innan R-kod skapas eller ändras. '+projectSupport.rules.join(' ')+ ' Källprioritering: metadata, mikrodataR-dokumentation, https://mikrometadata.scb.se/, befintliga skript, tidigare chattar. Ange metadata_sha256 med kod. Alla användare delar samma metadata; användarens privata filer ändrar inte servern.';
