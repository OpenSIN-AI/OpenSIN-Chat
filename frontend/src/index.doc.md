# Global Styles

## Purpose

Defines Tailwind v4 imports, OpenSIN theme tokens, runtime theme bridges, and global UI compatibility styles.

## Notes

- CSS imports must stay before normal rules to satisfy PostCSS and browser import-order rules.
- KaTeX CSS is loaded by the markdown plugin chunk; do not duplicate it here,
  because Tailwind's CSS import pipeline leaves KaTeX font URLs unresolved.
- Compatibility comments must remain syntactically valid CSS comments; malformed comment lines can become invalid selectors.
