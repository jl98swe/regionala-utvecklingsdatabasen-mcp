# ---- Invandringskohort och efterföljande etablering ----
# Metodstöd: Nederländerna v7, omarbetad till mikrodataR.
# Kohort: utrikes födda från valt avreseland, första invandring från startåret.
# Avreseland är inte samma sak som födelseland eller medborgarskap.
# Års-RTB visar observerad bosättning, inte exakt flyttmånad. Här följs fasta år.
# BAS-status lämnas som källkod: ingen obestyrkt tolkning av sysselsättning.
# Preliminär BAS och slutlig BAS får inte blandas i samma serie.
analys <- function(valt_land = "Nederländerna", start_ar = 2017L, slut_ar = 2020L, efter = 3L) {
  stopifnot(start_ar <= slut_ar, efter >= 1L)
  con <- uppkoppling_db()
  on.exit(DBI::dbDisconnect(con), add = TRUE)
  migr <- hamta(con, "in_utvandring_lisa", NULL,
    c("P1481_LopNr_PersonNr", "Posttyp", "InvUtvManad", "InvUtvLand_Grp"))
  # Lokal textmatchning följer referensskriptets metod.
  inv <- migr |> filter(.data$Posttyp == "Inv", toupper(trimws(.data$InvUtvLand_Grp)) == toupper(valt_land))
  manad <- suppressWarnings(as.integer(inv$InvUtvManad))
  if (anyNA(manad) || any(manad %% 100L < 1L | manad %% 100L > 12L)) stop("Ogiltig invandringsmånad.")
  inv$Invandringsar <- manad %/% 100L
  inv <- inv |> filter(.data$Invandringsar >= start_ar, .data$Invandringsar <= slut_ar) |>
    group_by(.data$P1481_LopNr_PersonNr) |> summarise(Invandringsar = min(.data$Invandringsar), .groups = "drop")
  inv <- unik(inv, "P1481_LopNr_PersonNr")
  if (!nrow(inv)) stop("Ingen invandringskohort hittades.")
  fod <- hamta(con, "fodelseland_lisa", NULL, c("P1481_LopNr_PersonNr", "FodelseLandNamn_Grp"), inv$P1481_LopNr_PersonNr)
  fod <- unik(fod, "P1481_LopNr_PersonNr", "exact")
  inv <- left_join(inv, fod, by = "P1481_LopNr_PersonNr", relationship = "one-to-one")
  saknar_fodelseland <- sum(is.na(inv$FodelseLandNamn_Grp) | trimws(inv$FodelseLandNamn_Grp) == "")
  inv <- inv |> filter(!is.na(.data$FodelseLandNamn_Grp), trimws(.data$FodelseLandNamn_Grp) != "",
    toupper(trimws(.data$FodelseLandNamn_Grp)) != "SVERIGE")
  inv$Uppfoljningsar <- inv$Invandringsar + efter
  panel <- list()
  for (y in sort(unique(inv$Uppfoljningsar))) {
    ids <- inv$P1481_LopNr_PersonNr[inv$Uppfoljningsar == y]
    bo <- hamta(con, "rtb", y, c("P1481_LopNr_PersonNr", "Kommun"), ids)
    bo <- unik(bo, "P1481_LopNr_PersonNr", "exact")
    # Slutlig BAS finns från 2020. Otillgängliga år stoppas; ingen tyst reservkälla.
    arb <- hamta(con, "bas", y, c("P1481_LopNr_PersonNr", "BAS", "AstKommun"), ids)
    arb <- unik(arb, "P1481_LopNr_PersonNr", "exact")
    panel[[as.character(y)]] <- inv |> filter(.data$Uppfoljningsar == y) |>
      left_join(bo, by = "P1481_LopNr_PersonNr", relationship = "one-to-one") |>
      left_join(arb, by = "P1481_LopNr_PersonNr", relationship = "one-to-one")
  }
  resultat <- bind_rows(panel)
  list(internt = resultat, kontroll = tibble(antal_kohort = nrow(inv), antal_resultat = nrow(resultat),
    saknar_fodelseland = saknar_fodelseland, saknar_bosattning = sum(is.na(resultat$Kommun)), saknar_bas = sum(is.na(resultat$BAS))))
}
# Exempel: välj kohorter vars uppföljningsår stöds av både RTB och BAS.
# resultat <- analys(start_ar = 2017L, slut_ar = 2020L, efter = 3L)
