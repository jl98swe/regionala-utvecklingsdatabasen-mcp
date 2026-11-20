# ---- Regionala utvecklingsdatabasen: gemensamma kontroller ----
# Körs endast av användaren i MONA. Servern kör aldrig denna kod.
# Verifierade registernamn används; Excel behövs inte vid körning.

# ---- Paket ----

library(mikrodataR)
library(dplyr)
library(dbplyr)
library(DBI)

# ---- Hjälpfunktioner ----

# Nycklar och klassificeringar behålls som character. Gör numerisk
# konvertering uttryckligen för de mått som ska beräknas.
# Text bearbetas i hjälpkolumner; ursprungliga nycklar ändras aldrig.
text_utf8 <- function(x) iconv(x, from = "", to = "UTF-8", sub = "byte")

text_trim <- function(x) trimws(text_utf8(x))

# Övervaka kodningsbyte och kollaps när normaliserad text ska grupperas/kopplas.
text_normalisera <- function(x) {
  original <- as.character(x)
  konverterad <- text_utf8(original)
  if (any(!is.na(original) & (is.na(konverterad) | konverterad != original)))
    stop("Kodningen ändrades. Behåll original och granska innan jämförelse/gruppering.")
  normal <- toupper(trimws(konverterad))
  par <- unique(data.frame(original = original, normal = normal))
  if (anyDuplicated(par$normal)) stop("Textnormalisering slår samman olika originalvärden. Granska grupperna.")
  normal
}

# Ange bara bortfallskoder som är belagda för variabeln, t.ex. via Mikrometadata.
# Koda/konvertera mått, aldrig löpnummer. Oväntade värden stoppar beräkningen.
numeriskt <- function(x, bortfall = character()) {
  txt <- text_trim(x)
  txt[is.na(txt) | txt == "" | txt %in% bortfall] <- NA_character_
  tal <- suppressWarnings(as.numeric(txt))
  if (any(!is.na(txt) & (is.na(tal) | !is.finite(tal))))
    stop("Ogiltigt numeriskt värde. Kontrollera format och dokumenterade bortfallskoder.")
  tal
}

# ---- Dubbletthantering ----

# Nyckel = by, analysenheten väljs av anroparen. policy='exact' tar endast
# bort identiska hela rader. Övriga konflikter stoppar. Ändra prioritering här
# om en sakligt motiverad regel finns; behåll alltid hela samma källrad.
unik <- function(df, by, policy = c("stop", "exact")) {
  policy <- match.arg(policy)
  if (policy == "exact") df <- distinct(df)
  if (anyNA(df[by]) || any(vapply(df[by], function(x) any(text_trim(x) == ""), logical(1)))) {
    stop("Saknad eller tom kopplingsnyckel.")
  }
  if (anyDuplicated(df[by])) stop("Flera rader per nyckel. Bestäm analysenhet och prioritetsregel; välj inte godtyckligt första raden.")
  df
}


# ---- Hämta registerdata ----

hamta <- function(con, vy, period, variabler, id = NULL, chunk_size = 4000L) {
  dokumenterade_argument <- c("valt_ar", "databasvy")
  if (!identical(names(formals(mikrodataR::hamta_korrekt_vynamn)), dokumenterade_argument))
    stop("mikrodataR avviker från dokumentationen. Kontrollera args(hamta_korrekt_vynamn) och packageVersion('mikrodataR').")
  # NULL och YYYYMM måste bekräftas för installerat paket; Rd anger inget löfte.
  fysisk_vy <- mikrodataR::hamta_korrekt_vynamn(valt_ar = period, databasvy = vy)
  tab <- dplyr::tbl(con, fysisk_vy)
  saknas <- setdiff(variabler, colnames(tab))
  if (length(saknas)) stop(paste("Variabler saknas i", vy, period, ":", paste(saknas, collapse = ", ")))
  tab <- select(tab, all_of(variabler))
  if (is.null(id)) return(collect(tab) %>%
    mutate(across(everything(), as.character)))
  stopifnot(length(chunk_size) == 1L, is.finite(chunk_size), chunk_size >= 1L)
  id <- unique(as.character(id[!is.na(id)]))
  if (!length(id)) return(collect(head(tab, 0)) %>%
    mutate(across(everything(), as.character)))
  # Begränsade ID-block följer LTU-underlagets arbetssätt.
  blocks <- split(id, ceiling(seq_along(id) / chunk_size))
  bind_rows(lapply(blocks, function(ids) {
    tab %>%
    filter(.data$P1481_LopNr_PersonNr %in% ids) %>%
    collect()
  })) %>%
    mutate(across(everything(), as.character))
}



# ---- Inställningar ----

# Gemensam projektmapp. Personmappen anges relativt denna, utan /utdata.
projekt_mapp <- "//micro.intra/projekt/P1481$/P1481_Gem/"
personlig_mapp <- ""  # Fyll i din organisations- och personmapp vid export.
utdata_mapp <- if (nzchar(personlig_mapp)) {
  file.path(projekt_mapp, personlig_mapp, "utdata")
} else {
  NA_character_
}

sma_tal_metod <- "under_5"  # Alternativ: "slump_0_3" efter användarens val.
sma_tal_grans <- 5L
sma_tal_markor <- "..."

# Inga kataloger eller filer skapas förrän användaren har begärt export.
# Vid export måste personlig_mapp fyllas i; byt inte till en annan rotmapp.


# ---- Hantering av små antal ----

# Egen implementation av slumpmetoden; ingen extern specialfunktion behövs.
# En etta blir 3 med sannolikhet 1/3, en tvåa med sannolikhet 2/3.
random_0_till_3 <- function(x) {
  if (!is.numeric(x) || any(!is.na(x) & (!is.finite(x) | x < 0 | x != trunc(x)))) {
    stop("Slumpmetoden kräver icke-negativa heltalsantal.")
  }

  resultat <- x
  for (varde in c(1, 2)) {
    positioner <- which(!is.na(x) & x == varde)
    resultat[positioner] <- sample(
      c(0, 3), length(positioner), replace = TRUE,
      prob = if (varde == 1) c(2/3, 1/3) else c(1/3, 2/3)
    )
  }

  resultat
}

# Använd bara på färdiga, ömsesidigt uteslutande antalsceller, inte individrader.
# Samma skyddade celler används för antal, total och andel; slumpa bara en gång.
# Resultatet innehåller inga ursprungliga antal eller dolda hjälpkolumner.
skydda_antal <- function(tabell, antal_kolumn = "antal", total_grupper = character(),
                         metod = sma_tal_metod, grans = sma_tal_grans,
                         markor = sma_tal_markor) {
  metod <- match.arg(metod, c("under_5", "slump_0_3"))
  stopifnot(length(grans) == 1L, is.finite(grans), grans >= 1L)
  stopifnot(all(c(antal_kolumn, total_grupper) %in% names(tabell)))
  stopifnot(!antal_kolumn %in% total_grupper)

  x <- tabell[[antal_kolumn]]
  if (!is.numeric(x) || any(!is.na(x) & (!is.finite(x) | x < 0 | x != trunc(x)))) {
    stop("Skydda aggregerade heltalsantal; konvertera character före beräkningen.")
  }

  if (metod == "under_5") {
    message("Standard: antal under ", grans, " visas som '", markor,
            "' och utesluts ur redovisad total och andelar. Du kan be om en annan metod.")
  } else {
    message("Vald slumpmetod: ettor och tvåor blir 0 eller 3. Totaler och andelar bygger på samma slumpade celler.")
  }

  skydda_grupp <- function(df) {
    original <- df[[antal_kolumn]]
    publicerat <- if (metod == "under_5") {
      ifelse(!is.na(original) & original >= grans, original, NA_real_)
    } else {
      random_0_till_3(original)
    }

    # Okända originalantal ger okänd total. Helt dolda grupper visar inte noll.
    total <- if (anyNA(original) || !any(!is.na(publicerat))) {
      NA_real_
    } else {
      sum(publicerat, na.rm = TRUE)
    }
    andel <- if (!is.na(total) && total > 0) publicerat / total * 100 else rep(NA_real_, length(publicerat))

    df[[antal_kolumn]] <- ifelse(is.na(publicerat), markor, as.character(publicerat))
    df$total_redovisad <- rep(ifelse(is.na(total), markor, as.character(total)), nrow(df))
    df$andel_redovisad <- ifelse(is.na(andel), markor, formatC(andel, format = "f", digits = 1))
    df
  }

  if (!length(total_grupper)) return(skydda_grupp(dplyr::ungroup(tabell)))

  tabell %>%
    dplyr::ungroup() %>%
    dplyr::group_by(dplyr::across(dplyr::all_of(total_grupper))) %>%
    dplyr::group_modify(~ skydda_grupp(.x)) %>%
    dplyr::ungroup()
}
