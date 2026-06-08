# Inline-Styles Audit (Issue #65)

> Stand: Agent 3. Ausgangslage **69 verbleibende** `style={{...}}`-Blöcke
> (142 ursprünglich, 73 bereits durch Agent 2 in `0399151a` migriert).

## Typen-Legende

- **A: Dynamic values** → Tailwind arbitrary values oder conditional classes
- **B: Magic numbers / statisch** → Tailwind-Utilities (ggf. arbitrary values)
- **C: Theme-dependent** → Tailwind `light:`-Variant / arbitrary gradient classes
- **D: Runtime-dynamisch** → bleibt als **dokumentierte Ausnahme** (Wert nur zur Laufzeit bekannt: Mausposition, berechnete Farben, Progress-%, 3rd-party SVG)
- **E: Conditional** → `clsx()` / Ternary über className

## Migration-Plan

| # | Datei | Zeile | Typ | Aktueller Wert | Lösung |
|---|-------|-------|-----|----------------|--------|
| 1 | EmbeddingSelection/GeminiOptions | 77 | B | maxWidth 250 + whiteSpace normal + wordWrap | `max-w-[250px] whitespace-normal break-words` |
| 2-4 | EmbeddingSelection/LMStudioOptions | 114,169,252 | B | Tooltip 250 | `max-w-[250px] whitespace-normal break-words` |
| 5 | EmbeddingSelection/LemonadeOptions | 128 | B | Tooltip 250 | `max-w-[250px] whitespace-normal break-words` |
| 6-8 | EmbeddingSelection/LocalAiOptions | 50,92,131 | B | Tooltip 250 | `max-w-[250px] whitespace-normal break-words` |
| 9 | LLMSelection/AzureAiOptions | 94 | B | Tooltip 250 | `max-w-[250px] whitespace-normal break-words` |
| 10 | LLMSelection/DockerModelRunnerOptions | 66 | B | Tooltip 250 | `max-w-[250px] whitespace-normal break-words` |
| 11 | LLMSelection/DockerModelRunnerOptions | 122 | B | Tooltip 350 | `max-w-[350px] whitespace-normal break-words` |
| 12-15 | LLMSelection/LMStudioOptions | 102,154,194,277 | B | Tooltip 250 | `max-w-[250px] whitespace-normal break-words` |
| 16 | LLMSelection/LemonadeOptions | 75 | B | Tooltip 250 | `max-w-[250px] whitespace-normal break-words` |
| 17-18 | LLMSelection/LemonadeOptions | 131,175 | B | Tooltip 350 | `max-w-[350px] whitespace-normal break-words` |
| 19-22 | LLMSelection/OllamaLLMOptions | 75,131,182,242 | B | Tooltip 250 | `max-w-[250px] whitespace-normal break-words` |
| 23 | LLMSelection/PrivateModeOptions | 59 | B | Tooltip 250 | `max-w-[250px] whitespace-normal break-words` |
| 24 | SpeechToText/LemonadeOptions | 54 | B | Tooltip 250 | `max-w-[250px] whitespace-normal break-words` |
| 25 | SpeechToText/LemonadeOptions | 100 | B | Tooltip 350 | `max-w-[350px] whitespace-normal break-words` |
| 26-27 | pages/Admin/Agents/SQLConnectorSelection | 204,216 | B | Tooltip 250 | `max-w-[250px] whitespace-normal break-words` |
| 28 | ChatHistory/StatusResponse | 24 | B | transition all 0.1s + borderRadius 16px | `transition-all duration-100 ease-in-out rounded-2xl` |
| 29 | ChatHistory/ThoughtContainer | 151 | B | transition + radius 16px | `transition-all duration-100 ease-in-out rounded-2xl` |
| 30 | ChatHistory/ToolApprovalRequest | 58 | B | transition + radius 16px | `transition-all duration-100 ease-in-out rounded-2xl` |
| 31-32 | pages/Admin/DefaultSystemPrompt | 219,234 | B | resize vertical + overflowY scroll + minHeight 150 | `resize-y overflow-y-scroll min-h-[150px]` |
| 33-34 | pages/WorkspaceSettings/ChatPromptSettings | 199,210 | B | resize vertical + overflowY scroll + minHeight 150 | `resize-y overflow-y-scroll min-h-[150px]` |
| 35 | PromptInput/Attachments | 143 | B | objectFit cover + objectPosition center | `object-cover object-center` |
| 36 | WorkspaceSettings/SuggestedChatMessages | 137 | B | top -8 + left 265 | `-top-2 left-[265px]` |
| 37 | ChatHistory/HistoricalMessage | 296 | C | linear-gradient dark fade | `bg-[linear-gradient(...)]` |
| 38 | ChatHistory/HistoricalMessage | 303 | C | linear-gradient light fade | `bg-[linear-gradient(...)]` |
| 39-40 | pages/OnboardingFlow/Steps/Home | 18,26 | C | radial-gradient dark/light | `bg-[radial-gradient(...)]` |
| 41 | pages/Admin/AgentBuilder | 331 | C | radial dot pattern (theme ternary) | conditional `bg-[radial-gradient(...)]` |
| 42 | ChatSidebar | 188 | E | width isOpen ? 366 : 0 | `clsx(isOpen ? "w-[366px]" : "w-0")` |
| 43 | Sidebar | 35 | E | width/paddingLeft showSidebar | conditional `w-[292px]`/`w-0`, `pl-0`/`pl-4` |
| 44 | Sidebar | 136 | E | transform showSidebar translateX | `translate-x-0`/`-translate-x-[100vw]` |
| 45 | SettingsSidebar | 70 | E | transform showSidebar translateX | `translate-x-0`/`-translate-x-[100vw]` |

## Dokumentierte Ausnahmen (Typ D — bleiben als `style`)

Diese Werte sind **nur zur Laufzeit bekannt** (Mausposition, berechnete Farben,
Progress-Prozente, dynamische Pixel) oder werden von 3rd-party-SVG (recharts) benötigt.
Statische Teile werden — wo möglich — in `className` ausgelagert, der dynamische Rest
bleibt minimal im `style`-Attribut.

| # | Datei | Zeile | Grund |
|---|-------|-------|-------|
| 46 | Modals/.../Directory/ContextMenu | 53 | dynamische Mausposition (`top/left`); `position fixed`/`zIndex` → className |
| 47 | PromptInput/.../SlashCommandRow | 77 | dynamische Menüposition; `position fixed` → className |
| 48 | MemoriesSidebar/MemoryCard/CardMenu | 33 | dynamische Position (`pos.top/left`) |
| 49 | pages/.../ConnectionModal | 19 | `backgroundImage: url(${BG})` dynamisch; statische Teile → className |
| 50 | ChatHistory/Chartable/CustomCell | 11 | berechnete `fill`-Farbe (Treemap-Tiefe) |
| 51-53 | ChatHistory/Chartable/CustomTooltip | 63,66,75 | berechnete Farben (`legendColor`, `invertColor`) |
| 54-57 | ChatHistory/Chartable/index | 155,166,215,226 | recharts-Axis `fontSize/fontFamily` (3rd-party SVG) |
| 58-62 | ChatHistory/Citation | 82,88,96,157,166 | dynamische Größe/Position (`size`, Index-Offset, zIndex) |
| 63 | ChatHistory/ClarifyingQuestion | 16 | Progress `width: ${percent}%` |
| 64 | .../EmbeddingFileRow | 90 | Progress `width: ${pct}%` |
| 65 | ChatHistory/ToolApprovalRequest | 91 | Progress `width: ${progressPercent}%` |
| 66-68 | Sidebar/.../ThreadItem | 64,74,85 | aus JS-Konstante berechnete Breite (Arithmetik) |
| 69 | PromptInput/ToolsMenu | 149 | dynamische `maxHeight` (berechnet) |

## Ergebnis-Ziel

- **~45 Styles** (Typ A/B/C/E) → vollständig zu Tailwind migriert
- **~24 Styles** (Typ D) → dokumentierte, begründete Ausnahmen (Runtime-Werte / 3rd-party)
- ESLint-Regel `react/forbid-dom-props` warnt vor neuen Inline-Styles
- Alle Tests bleiben grün
