# Changelog

> Release mode: dated - this project does not publish versions, tags, or releases.

The date of the change is the version, written `YYYY.MM.DD`.

## [2026.09.05]

### Added

- A GitHub Pages deploy workflow at `.github/workflows/pages.yml`, publishing
  the repository root on every push to `main` and on `workflow_dispatch`. It
  carries `contents: read`, `pages: write` and `id-token: write`, a `pages`
  concurrency group so overlapping deploys cannot race, and the configure,
  upload, deploy sequence with the deploy job bound to the `github-pages`
  environment.
- GitHub Pages enabled for the repository with its source set to GitHub
  Actions, publishing at <https://isocialpractice.github.io/cheatsheets/>.
- A `.nojekyll` file at the published root, so no path beginning with an
  underscore is dropped from the site.
- `DESIGN_LANGUAGE.md`, recording the site palette, the type scale, spacing,
  and the measured contrast ratio for every text and background pair the site
  uses. The palette separates the three colors counted in `favicon.ico`, which
  cover 97.72% of the mark, from the six derived from them, and each derived
  value names its origin and the ratio it was moved to reach.
- A **New Cheatsheets** roadmap section in `TODO.md`, covering ten new
  cheatsheet categories and the shared infrastructure they need.

### Changed

- The preview link in `README.md` now points at the repository's own
  published site instead of a third party HTML preview service.
- `selectExample()` in `index.html` loads each example's script and image by
  relative path. The branch that rewrote both to a CDN when the page was
  opened through the preview service is gone, along with the `checkPreview`
  variable that selected it.
