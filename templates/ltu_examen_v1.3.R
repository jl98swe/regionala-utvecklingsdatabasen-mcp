# ---- Examenskohort och bosättning ----
# Metodstöd: LTU v17. Detta är en generell delmall, inte hela tidigare analysen.
# Avser examinerade; använd inte resultatet som mått på alla som avslutat studier.
# Rekrytering = RTB året före Ffgar. Saknat Ffgar ger saknad rekryteringskommun.
# Uppföljning är ett fast målår. Ingen dold reservkälla eller sökning 1-3 år.
# HREG:s årstillgänglighet är okänd i metadata och kontrolleras i MONA.
# Dubbletter: välj uttryckligen "exact" endast om helt identiska rader ska tas bort.
# Som standard stoppas körningen vid flera rader per vald nyckel.
analys <- function(examensar = 2021L, efter = 3L, hogsk_kod = "002", dubbletter = "stop") {
  stopifnot(length(examensar) == 1L, length(efter) == 1L, efter >= 1L)

  # ---- Anslutning och urval ----

  con <- uppkoppling_db()
  on.exit(DBI::dbDisconnect(con), add = TRUE)
  krav_exam <- c("P1481_LopNr_PersonNr", "HsKod", "KAr")
  tab <- tbl(con, hamta_korrekt_vynamn(examensar, "hreg_examen"))
  stopifnot(all(krav_exam %in% colnames(tab)))
  # Filtrera före collect; flera examina reduceras uttryckligen till en person.
  kohort <- tab %>%
    filter(.data$HsKod == hogsk_kod, .data$KAr == as.character(examensar)) %>%
    select(P1481_LopNr_PersonNr) %>%
    distinct() %>%
    collect() %>%
    mutate(across(everything(), as.character))
  kohort <- unik(kohort, "P1481_LopNr_PersonNr")
  if (!nrow(kohort)) stop("Ingen examenskohort hittades.")

  # ---- Rekryteringskommun ----

  forstaar <- hamta(con, "hreg_forstaar", examensar, c("P1481_LopNr_PersonNr", "Ffgar"), kohort$P1481_LopNr_PersonNr)
  forstaar <- unik(forstaar, "P1481_LopNr_PersonNr", policy = dubbletter)
  bas <- left_join(kohort, forstaar, by = "P1481_LopNr_PersonNr", relationship = "one-to-one")
  ar <- numeriskt(bas$Ffgar)
  if (any(!is.na(ar) & (ar != trunc(ar) | ar < 1900L | ar > examensar))) stop("Ogiltigt Ffgar.")
  bas$rekryteringsar <- ar - 1L
  rek <- tibble(P1481_LopNr_PersonNr = character(), rekryteringskommun = character())

  for (y in sort(unique(na.omit(bas$rekryteringsar)))) {
    ids <- bas$P1481_LopNr_PersonNr[!is.na(bas$rekryteringsar) & bas$rekryteringsar == y]
    r <- hamta(con, "rtb", y, c("P1481_LopNr_PersonNr", "Kommun"), ids)
    r <- unik(r, "P1481_LopNr_PersonNr", policy = dubbletter) %>%
    rename(rekryteringskommun = Kommun)
    rek <- bind_rows(rek, r)
  }

  # ---- Uppföljning ----

  upp <- hamta(con, "rtb", examensar + efter, c("P1481_LopNr_PersonNr", "Kommun"), kohort$P1481_LopNr_PersonNr)
  upp <- unik(upp, "P1481_LopNr_PersonNr", policy = dubbletter) %>%
    rename(uppfoljningskommun = Kommun)

  resultat <- bas %>%
    left_join(rek, by = "P1481_LopNr_PersonNr", relationship = "one-to-one") %>%
    left_join(upp, by = "P1481_LopNr_PersonNr", relationship = "one-to-one")

  # ---- Redovisning av kontrollantal ----

  kontroll <- c(antal_kohort = nrow(kohort), antal_resultat = nrow(resultat),
    saknar_rekrytering = sum(is.na(resultat$rekryteringskommun)), saknar_uppfoljning = sum(is.na(resultat$uppfoljningskommun)))
  kontroll <- tibble(kontroll = names(kontroll), antal = as.numeric(kontroll)) %>%
    skydda_antal(total_grupper = "kontroll")

  list(internt = resultat, kontroll = kontroll)
}

# ---- Kör analysen ----

# Kör efter val av kohort och kontroll av alla behövliga RTB-år:
# resultat <- analys(examensar = 2021L, efter = 3L)
