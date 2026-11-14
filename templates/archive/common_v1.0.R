# ---- Regionala utvecklingsdatabasen: gemensamma kontroller ----
# Körs endast av användaren i MONA. Servern kör aldrig denna kod.
# Metadataversion och erforderliga namn bäddas in; Excel behövs inte vid körning.
library(mikrodataR)
library(dplyr)
library(dbplyr)
library(DBI)

# Nycklar och klassificeringar behålls som character. Gör numerisk
# konvertering uttryckligen för de mått som ska beräknas.
unik <- function(df, by, policy = c("stop", "exact")) {
  policy <- match.arg(policy)
  if (policy == "exact") df <- distinct(df)
  if (anyNA(df[by]) || any(vapply(df[by], function(x) any(trimws(x) == ""), logical(1)))) {
    stop("Saknad eller tom kopplingsnyckel.")
  }
  if (anyDuplicated(df[by])) stop("Flera rader per nyckel. Bestäm analysenhet och prioritetsregel; välj inte godtyckligt första raden.")
  df
}

hamta <- function(con, vy, period, variabler, id = NULL, chunk_size = 4000L) {
  fysisk_vy <- mikrodataR::hamta_korrekt_vynamn(period, vy)
  tab <- dplyr::tbl(con, fysisk_vy)
  saknas <- setdiff(variabler, colnames(tab))
  if (length(saknas)) stop(paste("Variabler saknas i", vy, period, ":", paste(saknas, collapse = ", ")))
  tab <- select(tab, all_of(variabler))
  if (is.null(id)) return(collect(tab) |> mutate(across(everything(), as.character)))
  stopifnot(length(chunk_size) == 1L, is.finite(chunk_size), chunk_size >= 1L)
  id <- unique(as.character(id[!is.na(id)]))
  if (!length(id)) return(collect(head(tab, 0)) |> mutate(across(everything(), as.character)))
  # Begränsade ID-block följer LTU-underlagets arbetssätt.
  blocks <- split(id, ceiling(seq_along(id) / chunk_size))
  bind_rows(lapply(blocks, function(ids) {
    tab |> filter(.data$P1481_LopNr_PersonNr %in% ids) |> collect()
  })) |> mutate(across(everything(), as.character))
}

# Ange en befintlig MONA-mapp via miljövariabeln eller ändra strängen.
utdata_mapp <- Sys.getenv("RUD_UTDATA", unset = "utdata")
dir.create(utdata_mapp, recursive = TRUE, showWarnings = FALSE)
# Ingen automatisk export av individdata eller röjandekänsliga tabeller.
# Granska aggregat enligt beställningens utlämningsregler innan export.
