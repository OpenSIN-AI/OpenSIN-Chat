# Inline-Styles Audit (Issue #65, #93, #111)

> Stand: Nach Issue #111. **21 verbleibende** `style={{...}}`-Blöcke aus den 12 in #111 gelisteten Dateien wurden auf Tailwind-Utility-Klassen + CSS-Custom-Properties umgestellt.

## Zusammenfassung

| Metrik | Wert |
|--------|------|
| Ursprünglich (Agent 1) | 142 |
| Agent 2 migriert (tooltip, transition, gradient, conditional) | 73 |
| isMobile-height-Muster migriert (Agents 3-5) | ~48 |
| In #111 verbleibend | **21** |
| In #111 konvertiert (Tailwind + CSS-Variablen) | **21** |
| Davon dynamic-required (nicht als statische Tailwind-Klasse ausdrückbar) | 21 |
| Davon als `style={{...}}` mit CSS-Variablen umgesetzt | 17 |
| Davon komplett in 3rd-Party-Props verschoben | 4 |
| **Verbleibende Inline-Styles in den 12 #111-Dateien** | **0** |

## Konvertierte Inline-Styles (21)

Alle 21 Werte sind **nur zur Laufzeit bekannt** (Mausposition, berechnete Farben, Progress-Prozente, 3rd-Party-Props, Build-time-URLs). Statt direkter Inline-Styles werden sie nun über **CSS-Custom-Properties** (`--*`) an die Elemente gegeben und von Tailwind-Utility-Klassen mit Arbitrary-Values (`[var(--...)]`) konsumiert. Für die vier Recharts-Achsen wurden `fontSize`/`fontFamily` in die `tick`-Props verschoben, sodass kein `style`-Attribut mehr nötig ist.

### Kategorie 1: Progress Bars (3)

| # | Datei | Zeile | Alter Wert | Neue Umsetzung | Grund |
|---|-------|-------|------------|----------------|-------|
| 1 | `Modals/ManageWorkspace/Documents/WorkspaceDirectory/EmbeddingFileRow.jsx` | 99 | `width: ${pct}%` | `style={{ "--embedding-progress": `${pct}%` }}` + `className="... w-[var(--embedding-progress)]"` | Dynamischer Embedding-Fortschritt |
| 2 | `WorkspaceChat/ChatContainer/ChatHistory/ToolApprovalRequest/index.tsx` | 92 | `width: ${progressPercent}%` | `style={{ "--approval-progress": `${progressPercent}%` }}` + `className="... w-[var(--approval-progress)]"` | Dynamischer Timeout-Fortschritt |
| 3 | `WorkspaceChat/ChatContainer/ChatHistory/ClarifyingQuestion/index.tsx` | 16 | `width: ${percent}%` | `style={{ "--timeout-progress": `${percent}%` }}` + `className="... w-[var(--timeout-progress)]"` | Dynamischer Timeout-Fortschritt |

### Kategorie 2: Context-Menu / Dropdown Positioning (3)

| # | Datei | Zeile | Alter Wert | Neue Umsetzung | Grund |
|---|-------|-------|------------|----------------|-------|
| 4 | `Modals/ManageWorkspace/Documents/Directory/ContextMenu/index.tsx` | 61 | `top: ${contextMenu.y}px, left: ${contextMenu.x}px` | `style={{ "--context-menu-top": ..., "--context-menu-left": ... }}` + `className="... top-[var(--context-menu-top)] left-[var(--context-menu-left)]"` | Mausposition, nur zur Laufzeit bekannt |
| 5 | `WorkspaceChat/ChatContainer/MemoriesSidebar/MemoryCard/CardMenu/index.tsx` | 40 | `top: pos.top, left: pos.left` | `style={{ "--card-menu-top": ..., "--card-menu-left": ... }}` + `className="... top-[var(--card-menu-top)] left-[var(--card-menu-left)]"` | Aus `getBoundingClientRect()` berechnet |
| 6 | `WorkspaceChat/ChatContainer/PromptInput/ToolsMenu/Tabs/SlashCommands/SlashCommandRow/index.tsx` | 84 | `top: menuPosition.top, left: menuPosition.left` | `style={{ "--slash-menu-top": ..., "--slash-menu-left": ... }}` + `className="... top-[var(--slash-menu-top)] left-[var(--slash-menu-left)]"` | Aus `getBoundingClientRect()` berechnet |

### Kategorie 3: Citation Sizing & Positioning (5)

| # | Datei | Zeile | Alter Wert | Neue Umsetzung | Grund |
|---|-------|-------|------------|----------------|-------|
| 7 | `WorkspaceChat/ChatContainer/ChatHistory/Citation/index.tsx` | 93 | `width: size, height: size` (Circle) | `style={{ "--source-circle-size": `${size}px` }}` + `className="... w-[var(--source-circle-size)] h-[var(--source-circle-size)]"` | Prop-gesteuerte Icon-Größe |
| 8 | `Citation/index.tsx` | 93 | `width: size, height: size` (Favicon) | Entfernt; Bilder füllen Parent via `className="w-full h-full"` | Prop-gesteuerte Favicon-Größe |
| 9 | `Citation/index.tsx` | 93 | `width: size, height: size` (Custom-Image) | Entfernt; Bilder füllen Parent via `className="w-full h-full"` | Prop-gesteuerte Custom-Image-Größe |
| 10 | `Citation/index.tsx` | 167 | `width: ${visibleSources.length * 17 + 5}px` | `style={{ "--citation-stack-width": ... }}` + `className="... w-[var(--citation-stack-width)]"` | Berechnete Breite aus Array-Länge |
| 11 | `Citation/index.tsx` | 178 | `left: ${idx * 17}px, zIndex: 3 - idx` | `style={{ "--citation-stack-left": ..., "--citation-stack-z": ... }}` + `className="... left-[var(--citation-stack-left)] z-[var(--citation-stack-z)]"` | Berechnete Position/Stacking |

### Kategorie 4: Recharts Axis Styles (4)

| # | Datei | Zeile | Alter Wert | Neue Umsetzung | Grund |
|---|-------|-------|------------|----------------|-------|
| 12 | `WorkspaceChat/ChatContainer/ChatHistory/Chartable/index.tsx` | 155 | `fontSize: "12px", fontFamily: "Inter; Helvetica"` | In `tick={{ fontSize: 12, fontFamily: "Inter; Helvetica" }}` verschoben | Recharts `XAxis`/`YAxis` akzeptieren Styling über `tick`-Props |
| 13 | `Chartable/index.tsx` | 166 | `fontSize: "12px", fontFamily: "Inter; Helvetica"` | In `tick={{ ... }}` verschoben | Recharts `YAxis` |
| 14 | `Chartable/index.tsx` | 215 | `fontSize: "12px", fontFamily: "Inter; Helvetica"` | In `tick={{ ... }}` verschoben | Recharts `ScatterChart` XAxis |
| 15 | `Chartable/index.tsx` | 226 | `fontSize: "12px", fontFamily: "Inter; Helvetica"` | In `tick={{ ... }}` verschoben | Recharts `ScatterChart` YAxis |

### Kategorie 5: SVG/Chart Dynamic Values (4)

| # | Datei | Zeile | Alter Wert | Neue Umsetzung | Grund |
|---|-------|-------|------------|----------------|-------|
| 16 | `WorkspaceChat/ChatContainer/ChatHistory/Chartable/CustomCell.tsx` | 12 | `fill/stroke/strokeWidth/strokeOpacity` | `style={{ "--cell-fill": ..., "--cell-stroke": ..., "--cell-stroke-width": ..., "--cell-stroke-opacity": ... }}` + `className="fill-[var(--cell-fill)] stroke-[var(--cell-stroke)] stroke-[var(--cell-stroke-width)] stroke-opacity-[var(--cell-stroke-opacity)]"` | SVG-Attribute, aus Treemap-Tiefe berechnet |
| 17 | `WorkspaceChat/ChatContainer/ChatHistory/Chartable/CustomTooltip.tsx` | 59 | `backgroundColor: legendColor` | `style={{ "--legend-color": legendColor, "--legend-text-color": invertColor(...) }}` + `className="... bg-[var(--legend-color)]"` | Dynamische Legenden-Farbe |
| 18 | `CustomTooltip.tsx` | 59 | `color: invertColor(legendColor, true)` | `text-[var(--legend-text-color)]` | Berechnete Kontrast-Farbe |
| 19 | `CustomTooltip.tsx` | 59 | `color: invertColor(legendColor, true)` | `text-[var(--legend-text-color)]` | Berechnete Kontrast-Farbe |

### Kategorie 6: Other Dynamic (2)

| # | Datei | Zeile | Alter Wert | Neue Umsetzung | Grund |
|---|-------|-------|------------|----------------|-------|
| 20 | `WorkspaceChat/ChatContainer/PromptInput/ToolsMenu/index.tsx` | 158 | `maxHeight` | `style={{ "--tools-menu-max-height": `${maxHeight}px` }}` + `className="... max-h-[var(--tools-menu-max-height)]"` | Berechneter Viewport-Wert |
| 21 | `pages/GeneralSettings/MobileConnections/ConnectionModal/index.jsx` | 22 | `backgroundImage: url(${BG})` | `style={{ "--connection-modal-bg": `url(${BG})` }}` + `className="... bg-[var(--connection-modal-bg)]"` | Build-time gehashte Asset-URL |

## Ergebnis

- **0 verbleibende Inline-Styles** in den 12 in Issue #111 gelisteten Dateien.
- Alle 21 Werte sind entweder in **Tailwind-Utility-Klassen mit CSS-Custom-Properties** (`[var(--...)]`) überführt oder in 3rd-Party-Component-Props (Recharts `tick`) verschoben worden.
- Verhalten der Komponenten wurde **nicht verändert**.
- ESLint-Regel aktualisiert: `inlineStyles/css-vars-only` erlaubt jetzt nur noch `style={{...}}`-Objekte, deren Keys ausschließlich CSS-Custom-Properties (`--*`) sind. Nicht dokumentierte Ausnahmen müssen in `docs/INLINE-STYLES-AUDIT.md` festgehalten werden.
- Build (`vite build`) und Test-Suite (`vitest run`) laufen erfolgreich durch.

## Hinweis zu weiteren Dateien

Dieses Audit betrachtet ausschließlich die 12 Dateien aus Issue #111. Weitere Inline-Styles in anderen Dateien (z.B. `Sidebar`, `DefaultChat`, `AttachItem`) sind **nicht Teil von Issue #111** und wurden daher nicht angefasst.
