# Syntetiska exempel: små antal, totaler och slumpmetod. Ingen MONA-data.
expr <- parse("templates/common_v1.3.R", encoding = "UTF-8")
for (e in expr) {
  if (is.call(e) && identical(e[[1]], as.name("<-")) &&
      as.character(e[[2]]) %in% c("random_0_till_3", "skydda_antal", "sma_tal_metod", "sma_tal_grans", "sma_tal_markor")) {
    eval(e)
  }
}

x <- tibble(grupp = c("a", "b", "c", "d", "e"), antal = c(0, 1, 2, 4, 5))
y <- skydda_antal(x)
stopifnot(identical(y$antal, c("...", "...", "...", "...", "5")))
stopifnot(all(y$total_redovisad == "5"))
stopifnot(identical(y$andel_redovisad, c("...", "...", "...", "...", "100.0")))
stopifnot(identical(names(y), c("grupp", "antal", "total_redovisad", "andel_redovisad")))

all_hidden <- skydda_antal(tibble(antal = c(1, 2, 4)))
stopifnot(all(all_hidden$total_redovisad == "..."), all(all_hidden$andel_redovisad == "..."))
missing <- skydda_antal(tibble(antal = c(NA_real_, 5, 10)))
stopifnot(all(missing$total_redovisad == "..."), all(missing$andel_redovisad == "..."))
stopifnot(nrow(skydda_antal(tibble(antal = numeric()))) == 0L)
stopifnot(skydda_antal(tibble(antal = c(5, 10)), grans = 6)$antal[1] == "...")

# Totalen räknas separat i varje uttryckligen vald grupp.
g <- tibble(ar = c(2020, 2020, 2021, 2021), antal = c(2, 8, 10, 20))
g <- skydda_antal(g, total_grupper = "ar")
stopifnot(identical(g$total_redovisad, c("8", "8", "30", "30")))
stopifnot(identical(g$andel_redovisad, c("...", "100.0", "33.3", "66.7")))

set.seed(100)
z <- random_0_till_3(c(0, 1, 2, 3, 4, 5, NA_real_))
stopifnot(identical(z[c(1, 4, 5, 6)], c(0, 3, 4, 5)), is.na(z[7]), all(z[2:3] %in% c(0, 3)))
stopifnot(abs(mean(random_0_till_3(rep(1, 100000))) - 1) < .03)
stopifnot(abs(mean(random_0_till_3(rep(2, 100000))) - 2) < .03)
stopifnot(inherits(try(random_0_till_3(c(-1, 1)), silent = TRUE), "try-error"))
stopifnot(inherits(try(skydda_antal(tibble(antal = c(1.5, 5))), silent = TRUE), "try-error"))

set.seed(200)
r <- skydda_antal(tibble(antal = c(rep(1, 20), rep(2, 20), 5)), metod = "slump_0_3")
stopifnot(all(r$total_redovisad == as.character(sum(as.numeric(r$antal)))))
stopifnot(!any(r$antal %in% c("1", "2")))
cat("Synthetic small-count suppression, grouped totals, missing values and randomization tests PASS\n")
