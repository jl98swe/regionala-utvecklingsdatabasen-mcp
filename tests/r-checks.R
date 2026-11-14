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
expr <- parse("templates/common.R", encoding = "UTF-8")
for (e in expr) if (is.call(e) && identical(e[[1]], as.name("<-")) && identical(e[[2]], as.name("unik"))) eval(e)
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
