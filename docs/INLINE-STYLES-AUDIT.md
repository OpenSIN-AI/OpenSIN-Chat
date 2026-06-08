# Inline-Styles Audit (Issue #65, #93)

> Stand: Final audit. **21 verbleibende** `style={{...}}`-Blöcke.
> Ursprünglich 142, davon 73 durch Agent 2 (`0399151a`), ~48 isMobile-height-Muster
> durch Agents 3-5 migriert. Alle konvertierbaren Inline-Styles sind jetzt Tailwind.

## Zusammenfassung

| Metrik | Wert |
|--------|------|
| Ursprünglich (Agent 1) | 142 |
| Agent 2 migriert (tooltip, transition, gradient, conditional) | 73 |
| isMobile-height-Muster migriert (Agents 3-5) | ~48 |
| **Verbleibend** | **21** |
| Davon dynamic-required (nicht konvertierbar) | 21 |
| Davon konvertierbar | 0 |

## Verbleibende Inline-Styles (21) — Alle Dynamic-Required

Alle 21 verbleibenden Inline-Styles verwenden **nur zur Laufzeit bekannte Werte**
(Mausposition, berechnete Farben, Progress-Prozente, 3rd-party-Props, Build-time-URLs)
und können nicht zu Tailwind-Utilities migriert werden.

### Kategorie 1: Context-Menu Positioning (3)

| # | Datei | Zeile | Wert | Grund |
|---|-------|-------|------|-------|
| 1 | `Modals/.../Directory/ContextMenu/index.tsx` | 53 | `top: ${contextMenu.y}px, left: ${contextMenu.x}px` | Mausposition, nur zur Laufzeit bekannt |
| 2 | `MemoriesSidebar/MemoryCard/CardMenu/index.tsx` | 33 | `top: pos.top, left: pos.left` | Aus `getBoundingClientRect()` berechnet |
| 3 | `PromptInput/.../SlashCommandRow/index.tsx` | 77 | `top: menuPosition.top, left: menuPosition.left` | Aus `getBoundingClientRect()` berechnet |

### Kategorie 2: Progress Bars (3)

| # | Datei | Zeile | Wert | Grund |
|---|-------|-------|------|-------|
| 4 | `EmbeddingFileRow.jsx` | 90 | `width: ${pct}%` | Dynamischer Embedding-Fortschritt |
| 5 | `ToolApprovalRequest/index.tsx` | 87 | `width: ${progressPercent}%` | Dynamischer Timeout-Fortschritt |
| 6 | `ClarifyingQuestion/index.tsx` | 16 | `width: ${percent}%` | Dynamischer Timeout-Fortschritt |

### Kategorie 3: Citation Sizing & Positioning (5)

| # | Datei | Zeile | Wert | Grund |
|---|-------|-------|------|-------|
| 7 | `Citation/index.tsx` | 82 | `width: size, height: size` | Prop-gesteuerte Icon-Größe |
| 8 | `Citation/index.tsx` | 88 | `width: size, height: size` | Prop-gesteuerte Favicon-Größe |
| 9 | `Citation/index.tsx` | 96 | `width: size, height: size` | Prop-gesteuerte Custom-Image-Größe |
| 10 | `Citation/index.tsx` | 157 | `width: ${visibleSources.length * 17 + 5}px` | Berechnete Breite aus Array-Länge |
| 11 | `Citation/index.tsx` | 166 | `left: ${idx * 17}px, zIndex: 3 - idx` | Berechnete Position/Stacking |

### Kategorie 4: Recharts Axis Styles (4)

| # | Datei | Zeile | Wert | Grund |
|---|-------|-------|------|-------|
| 12 | `Chartable/index.tsx` | 155 | `fontSize: "12px", fontFamily: "Inter; Helvetica"` | Recharts `style`-Prop (nicht CSS) |
| 13 | `Chartable/index.tsx` | 166 | `fontSize: "12px", fontFamily: "Inter; Helvetica"` | Recharts `style`-Prop (nicht CSS) |
| 14 | `Chartable/index.tsx` | 215 | `fontSize: "12px", fontFamily: "Inter; Helvetica"` | Recharts `style`-Prop (nicht CSS) |
| 15 | `Chartable/index.tsx` | 226 | `fontSize: "12px", fontFamily: "Inter; Helvetica"` | Recharts `style`-Prop (nicht CSS) |

### Kategorie 5: SVG/Chart Dynamic Values (4)

| # | Datei | Zeile | Wert | Grund |
|---|-------|-------|------|-------|
| 16 | `CustomCell.tsx` | 11 | `fill/stroke/strokeWidth/strokeOpacity` | SVG-Attribute, aus Treemap-Tiefe berechnet |
| 17 | `CustomTooltip.tsx` | 63 | `backgroundColor: legendColor` | Dynamische Legenden-Farbe |
| 18 | `CustomTooltip.tsx` | 66 | `color: invertColor(legendColor, true)` | Berechnete Kontrast-Farbe |
| 19 | `CustomTooltip.tsx` | 75 | `color: invertColor(legendColor, true)` | Berechnete Kontrast-Farbe |

### Kategorie 6: Other Dynamic (2)

| # | Datei | Zeile | Wert | Grund |
|---|-------|-------|------|-------|
| 20 | `ToolsMenu/index.tsx` | 149 | `maxHeight` | Berechneter Viewport-Wert |
| 21 | `MobileConnections/ConnectionModal/index.jsx` | 20 | `backgroundImage: url(${BG})` | Build-time gehashte Asset-URL |

## Ergebnis

- **0 verbleibende konvertierbare** Inline-Styles — alle 21 verbleibenden sind dynamic-required
- isMobile-height-Muster: vollständig migriert zu `${isMobile ? "h-full" : "h-[calc(100%-32px)]"}` in className
- ESLint-Regel `react/forbid-dom-props` warnt vor neuen Inline-Styles
- Alle Tests grün (6 pre-existing Hook-Failures unrelated)
