# Granskning av fler variabelkandidater, 2026-11-21

Underlag: beställningskatalogen i `data/metadata.json`, SCB:s fullständiga
Mikrometadata-index (uppdaterat 2026-11-15) och direkt granskning av
beskrivningstabellerna för `lgr6101`, `lhar6103` och `FTEXI_OCCUP_RSE_T`.

| Vy | Ny dokumentationskoppling | Underlag och avgränsning |
|---|---|---|
| `fek_lve` | `MedeltalAnstallda` → `lgr6101` | FEK Slutdata (LVE), Medelantal anställda. Definition: årsanställda omräknade till heltid. Måttenhet Antal; lokal verksamhetsenhet. Källversioner 2003–2024. |
| `fek_lve` | `SysselsattaRAMS` → `lhar6103` | Samma variant och objekttyp. Definition: antal sysselsatta enligt RAMS. Måttenhet Antal. Källversioner 2003–2021. |
| `fdb_ae` | `StartDatKtid`, `SlutDatKtid` | Exakta namn i SCB:s företagsregister / Arbetsställeenheter, 1999–2022. Endast dessa två kolumner kopplas mot den extra varianten. |
| `fdb_je` | `StartDatKtid`, `SlutDatKtid` | Exakta namn i SCB:s företagsregister / Juridiska enheter, 1999–2022. Andra objekttyper, exempelvis LVE, får ingen automatisk koppling. |
| `iot` | `BKE04HB`, `CDISP504HB`, `CDISP5HB` | Exakta namn i IoT / Bostadshushåll: konsumtionsenhetsvikt respektive disponibel inkomst. Den vanliga individvarianten ersätts inte. |
| `ftg_fou` | 16 namngivna kolumner i FRIDA / Forskning och utveckling | Direkta kolumnträffar. Den granskade beskrivningen anger Forskning och utveckling i Sverige / Företag som källa. Endast definitioner; FRIDA-populationen och versionen bevaras separat. |

Alias ändrar inga MONA-kolumnnamn, beställningsår eller data. Beställningen börjar
1998 respektive 2002 för FEK-måtten; dessa tidigare år verifieras inte av SCB:s
källversioner från 2003. Namn- och definitionsgranskningen bevisar inte numerisk
skala, eventuell omräkning eller exakt population i en levererad beställningsvy.

## Kandidater som inte godkänts

- De fyra nya FoU-vyerna har fyra exakta FTEXI/HCXI-namn i FRIDA:s FoU-variant.
  Källan anger dock företagsenhet och minst tio anställda, med undantag för
  industriforskningsinstitut. Samma namn bevisar inte att JE-data eller
  mikroföretagsdata använder samma population och bearbetning.
- `ureg_ky_yh_fhsk`: samtliga åtta sakvariabler återfinns i flera UREG-varianter.
  Varken namnprofil eller årgångar avgör om uppgifterna avser högsta utbildning,
  samtliga utbildningar eller en särskild bearbetning.
- Generiska träffar som `EU`, `Kommun`, `Kon` eller `LansKod` godkänns inte som
  registerkoppling när ämne och övrig kolumnprofil pekar åt ett annat håll.
- Nyckelregistret innehåller kodkolumnerna `SUN2020Grp_E23` och `SUN2020Grp_T23`.
  Det ger kompletterande klartextstöd, men verifierar inte att uppslagsvyerna
  `ruma_e23` och `ruma_t23` har identiskt innehåll eller exakt samma ursprung.

Efter granskningen: 63 vyer med granskade källvarianter och 1 454 kopplade
variabelposter. Det är 25 fler variabelposter än före denna granskning.

Källsida: https://mikrometadata.scb.se/.
Full konfiguration, kolumnavgränsningar och motiveringar:
[order-source-review.json](../data/order-source-review.json).
