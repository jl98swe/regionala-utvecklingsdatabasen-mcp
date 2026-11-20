# Syntax and synthetic method tests. No mikrodataR or MONA is required.
library(dplyr)
files <- c(list.files("templates", pattern = "[.]R$", full.names = TRUE),
           list.files("dist/r", pattern = "[.]R$", full.names = TRUE))
stopifnot(length(files) >= 6L)
for (f in files) {
  parse(f, encoding = "UTF-8")
  cat("R syntax PASS:", f, "\n")
}
# Evaluate only the pure duplicate-control function, never database code.
expr <- parse("templates/common_v1.3.R", encoding = "UTF-8")
for (e in expr) if (is.call(e) && identical(e[[1]], as.name("<-")) && as.character(e[[2]]) %in% c("unik", "text_utf8", "text_trim", "text_normalisera", "numeriskt")) eval(e)
stopifnot(exists("unik"))
a <- tibble(id = c("01", "02"), value = c("x", "y"))
stopifnot(nrow(unik(a, "id")) == 2L)
stopifnot(inherits(try(unik(bind_rows(a, a[1, ]), "id"), silent = TRUE), "try-error"))
stopifnot(nrow(unik(bind_rows(a, a[1, ]), "id", "exact")) == 2L)
conflict <- tibble(id = c("01", "01"), value = c("x", "different"))
stopifnot(inherits(try(unik(conflict, "id", "exact"), silent = TRUE), "try-error"))
stopifnot(inherits(try(unik(tibble(id = c("01", NA_character_)), "id"), silent = TRUE), "try-error"))
stopifnot(inherits(try(unik(tibble(id = c("01", " ")), "id"), silent = TRUE), "try-error"))
b <- tibble(id = "01", status = "code")
c <- left_join(a, b, by = "id", relationship = "one-to-one")
stopifnot(nrow(c) == 2L, is.na(c$status[2]), c$id[1] == "01")
stopifnot(inherits(try(left_join(a, conflict, by = "id", relationship = "one-to-one"), silent = TRUE), "try-error"))
cat("Synthetic duplicate, missing-key and join cardinality tests PASS\n")

# Synthetic examples only: encoding, missing codes and numeric order.
stopifnot(identical(text_normalisera(c("ÅÄÖ", "Nederländerna")), c("ÅÄÖ", "NEDERLÄNDERNA")))
stopifnot(inherits(try(text_normalisera(c("Sverige", " SVERIGE ")), silent = TRUE), "try-error"))
stopifnot(identical(numeriskt(c("10", "2", "", NA, ".."), bortfall = ".."), c(10, 2, NA_real_, NA_real_, NA_real_)))
stopifnot(inherits(try(numeriskt(c("1", "saknas")), silent = TRUE), "try-error"))
stopifnot(inherits(try(numeriskt("Inf"), silent = TRUE), "try-error"))
stopifnot(identical(sort(numeriskt(c("10", "2"))), c(2, 10)))
ids <- tibble(id = c("001", "002"), x = c("a", "b"))
stopifnot(identical(unik(ids, "id")$id, ids$id))
cat("Synthetic UTF-8, normalization, missing code and numeric order tests PASS\n")

source("tests/small-counts.R", encoding = "UTF-8")

# Syntetiska exempel: årsvisa namnbyten, numerik och bevarade identifierare.
expr <- parse("templates/common_v1.3.R", encoding = "UTF-8")
for (e in expr) if (is.call(e) && identical(e[[1]], as.name("<-")) &&
    identical(e[[2]], as.name("harmonisera_uttag"))) eval(e)
a <- data.frame(id = "001", TotalPoäng = "10", check.names = FALSE)
b <- data.frame(id = "002", TotalPoang = "2")
a <- harmonisera_uttag(a, "TotalPoäng", "totalpoang", 2004)
b <- harmonisera_uttag(b, "TotalPoang", "totalpoang", 2005)
c <- bind_rows(a, b)
stopifnot(identical(c$id, c("001", "002")), identical(c$totalpoang, c(10, 2)))
stopifnot(identical(c$uttag_ar, c(2004L, 2005L)), identical(sort(c$totalpoang), c(2, 10)))
d <- harmonisera_uttag(data.frame(x = c("", "..", NA)), "x", "varde", 2004, "..")
stopifnot(all(is.na(d$varde)))
stopifnot(inherits(try(harmonisera_uttag(data.frame(x = "1", varde = "2"), "x", "varde", 2004), silent = TRUE), "try-error"))
cat("Synthetic versioned-name, numeric conversion, missing value and identifier tests PASS\n")

# Syntetiska händelser: ett upprepat löpnummer är inte fel på händelsenivå.
h <- tibble(id = c("001", "001", "001"), period = c("201801", "202101", "202401"))
stopifnot(nrow(unik(h, c("id", "period"))) == 3L)
stopifnot(inherits(try(unik(h, "id"), silent = TRUE), "try-error"))
