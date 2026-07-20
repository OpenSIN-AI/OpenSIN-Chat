# OpenMontage Best Practices

> Wie man PROFESSIONELLE Videos mit OpenMontage erstellt — nicht das Slideshow-Desaster.

## Die Goldene Regel

**Jede Pipeline-Stufe hat einen Director Skill. LESE IHN vor jedem Schritt.**

```
proposal-director.md → script-director.md → scene-director.md
→ asset-director.md → edit-director.md → compose-director.md
```

## BUGS DIE DU KENNEN MUSST (gefixt 2026-07-20)

### Bug 1: Relative Pfade in Remotion kaputt
`tools/video/video_compose.py` hat relative Pfade wie `14-login.png` zu `file://` URIs konvertiert statt sie für `staticFile()` durchzureichen. **Fix ist drin** — aber prüfe ob dein Branch den Fix hat.

### Bug 2: Kompositionsdauer falsch
`remotion-composer/src/Root.tsx` hat `max(out_seconds)` als Dauer genommen statt die Summe aller Cut-Durationen. Bei 8 Cuts mit je 0-11s resultierte das in 10s statt 60s. **Fix ist drin.**

### Bug 3: cut.overlay wird ignoriert
Overlays MÜSSEN in das top-level `overlays` Array, nicht in `cut.overlay`. SceneRenderer rendert nur `overlays[]`, nicht `cut.overlay`.

## Pipeline-Überblick

```
Research → Proposal → Script → Scene Plan → Assets → Edit → Compose
   ↓          ↓         ↓          ↓           ↓       ↓       ↓
 Brief    Konzept   Drehbuch   Szenen-    Bilder   Schnitt  Render
                     + TTS     plan       + Audio
```

**Jede Stufe producing ein Artifact. Das nächste Artifact basiert auf dem vorherigen.**

---

## 1. Proposal Stage — Das Fundament

### Was der Proposal-Director macht
- Präsentiert **3+ Konzepte** mit Hook, Struktur, visuellem Ansatz
- Wählt **Render Runtime** (Remotion vs HyperFrames vs FFmpeg)
- Erstellt **Kostenschätzung**
- Holt **User Approval** VOR Asset-Generierung

### Was du tun musst
```bash
# IMMER zuerst: Preflight — was ist verfügbar?
python -c "from tools.tool_registry import registry; import json; registry.discover(); print(json.dumps(registry.provider_menu_summary(), indent=2))"
```

### Render Runtime wählen
| Runtime | Wann | Komponenten |
|---------|------|-------------|
| **Remotion** | Text, Charts, Animation | hero_title, text_card, stat_card, bar_chart, callout, comparison |
| **HyperFrames** | Kinetic Typography, HTML/GSAP | SplitText, DrawSVG, Custom Ease |
| **FFmpeg** | Nur wenn kein Node.js | Statische Bilder + Ken Burns |

**Regel:** Wenn Remotion verfügbar ist, IMMER Remotion verwenden. FFmpeg ist nur ein Fallback.

---

## 2. Script Stage — Drehbuch schreiben

### Was der Script-Director macht
- Schreibt **Narration mit Timing**
- Definiert **Speaker Directions** (Betonung, Tempo, Pausen)
- Plant **Enhancement Cues** (visuelle Hinweise pro Sektion)

### Script-Struktur
```json
{
  "id": "s1",
  "label": "Hook",
  "text": "Was wenn Ihre KI nur aus Ihren eigenen Quellen antwortet?",
  "start_seconds": 0,
  "end_seconds": 6,
  "speaker_directions": "Ruhig und sicher beginnen. Betonung auf 'Ihren eigenen Quellen'.",
  "delivery_cues": {
    "pace": "measured",
    "energy": "confident",
    "emphasis_words": ["Ihren", "eigenen", "Quellen"],
    "pause_after_seconds": 0.5
  },
  "enhancement_cues": [
    {"type": "overlay", "description": "Hero title: OpenAFD Chat", "timestamp_seconds": 1}
  ]
}
```

### Timing-Regeln
| Pace | Wörter/Sekunde | Wann |
|------|----------------|------|
| Contemplative | 2.0-2.5 | Komplexe Themen |
| Conversational | 2.5-3.0 | Default |
| Energetic | 3.0-3.5 | TikTok/Reels |

**60 Sekunden Video → ~150 Wörter Narration**

---

## 3. Scene Plan — Das Visuelle Konzept

### Was der Scene-Director macht
- Transformiert jedes Script-Sektion in **1-3 visuelle Szenen**
- Wählt **Scene Types** aus der Remotion-Bibliothek
- Definiert **Overlays, Transitions, Timing**

### Scene Types (Remotion Components)

| Type | Wann | Beispiel |
|------|------|----------|
| `hero_title` | Intro, Outro | "OpenAFD Chat — Ihr souveräner KI-Arbeitsraum" |
| `text_card` | Statements, Schlüsselbegriffe | "DSGVO-konform. Self-Hosted." |
| `stat_card` | Große Zahlen | "750+ Abgeordnete durchsuchbar" |
| `callout` | Zitate, Tipps, Warnungen | Experten-Zitat einblenden |
| `comparison` | Vorher/Nachher, A vs B | "Piper vs ElevenLabs" |
| `bar_chart` | Vergleiche, Rankings | "Beliebteste TTS-Provider" |
| `line_chart` | Trends, Zeitreihen | "Nutzerwachstum 2024-2026" |
| `pie_chart` | Anteile, Verteilungen | "Dokument-Formate im Workspace" |
| `kpi_grid` | Dashboard, Kennzahlen | 4 Kennzahlen auf einen Blick |
| `progress_bar` | Fortschritt, Journey | "Upload-Fortschritt" |

### Visual Technique Library

**Diagram Reveal**
Diagramm progressiv aufbauen — leer starten, Knoten einzeln einblenden.
```
"Mermaid flowchart: Query → Embed → Search → Rank → Return. 
Knoten erscheinen einzeln wenn Narrator jeden Schritt beschreibt."
```

**Stat Card Punch**
Vollbild-Zahl mit Impact-Animation (Scale-Up, leichter Bounce).
```json
{
  "type": "stat_card",
  "stat": "750+",
  "subtitle": "Bundestags-Abgeordnete",
  "accentColor": "#009ee0"
}
```

**Before/After Split**
Problem → Lösung mit `comparison` Typ.
```json
{
  "type": "comparison",
  "leftLabel": "Vorher",
  "leftValue": "Manuelle Recherche",
  "rightLabel": "Nachher",
  "rightValue": "KI-gestützt mit Zitaten"
}
```

**Timeline Progression**
Links-nach-rechts Sequenz für Evolution/Prozess.
```
"1990: Stichwortsuche → 2010: Semantische Suche → 2024: Vektor-DB"
```

### Szenen-Checkliste
- [ ] Jede Sektion hat mindestens 1 Szene
- [ ] Keine 3+ aufeinanderfolgende Szenen desselben Typs
- [ ] Mindestens 3 verschiedene Scene Types verwendet
- [ ] Übergänge definiert (fade, dissolve, slide)
- [ ] Overlays definiert (section_title, stat_reveal)
- [ ] Timing korrekt (keine Lücken >1s)

---

## 4. Asset Stage — Assets generieren

### Was der Asset-Director macht
- Generiert **Narration** (TTS)
- Generiert **Bilder** (FLUX/Imagen/DALL-E) oder nutzt bestehende
- Sucht **Musik** (Pixabay, Suno)
- Generiert **Subtitles** (WhisperX)

### TTS-Auswahl
| Provider | Kosten | Qualität | Wann |
|----------|--------|----------|------|
| **ElevenLabs** | $0.18-0.30/min | Premium | Hero-Videos |
| **OpenAI TTS** | $0.015/min | Gut | Default |
| **Google TTS** | $0.004/1K chars | Solide | Budget |
| **Piper** | $0 (lokal) | Robotisch | NUR wenn kein Internet |

**Regel:** Für deutsche Inhalte: OpenAI TTS mit `onyx` (tief, autoritär) oder `nova` (hell, energetisch).

### Musik
```python
# Immer prüfen:
# 1. music_library/ — eigene Tracks (kostenlos)
# 2. Pixabay Music — Royalty-Free (kostenlos mit Key)
# 3. Suno AI — generiert ($0.05-0.10/Song)

from tools.audio.pixabay_music import PixabayMusic
result = PixabayMusic().execute({
    'query': 'corporate ambient',
    'min_duration': 60,
    'output_path': 'music.mp3'
})
```

### Subtitles (MANDATORY)
```python
# 1. Narration transkribieren
from tools.analysis.transcriber import Transcriber
result = Transcriber().execute({
    'input_path': 'narration.mp3',
    'model_size': 'base',
    'language': 'de'
})

# 2. Word-Level Captions für Remotion
captions = []
for segment in result.data['segments']:
    for word in segment.get('words', []):
        captions.append({
            'word': word['word'],
            'startMs': int(word['start'] * 1000),
            'endMs': int(word['end'] * 1000)
        })
```

---

## 5. Edit Stage — Schnitt-Entscheidungen

### Edit Decisions Schema
```json
{
  "version": "1.0",
  "render_runtime": "remotion",
  "cuts": [
    {
      "id": "cut-1",
      "source": "image.png",
      "in_seconds": 0,
      "out_seconds": 6.3,
      "transform": {"animation": "zoom-in"},
      "transition_in": "fade",
      "transition_out": "fade",
      "transition_duration": 0.5
    }
  ],
  "audio": {
    "narration": {
      "segments": [
        {"asset_id": "narration-s1", "start_seconds": 0, "end_seconds": 6.3}
      ]
    },
    "music": {
      "asset_id": "music-track",
      "volume": 0.08,
      "fade_in_seconds": 1.5,
      "fade_out_seconds": 2.5
    }
  },
  "subtitles": {
    "enabled": true,
    "style": "word-by-word"
  }
}
```

---

## 6. Compose Stage — Rendern

### Remotion Render (DEFAULT)
```python
from tools.video.video_compose import VideoCompose
vc = VideoCompose()
result = vc.execute({
    'operation': 'render',
    'edit_decisions': edit_decisions,
    'asset_manifest': asset_manifest,
    'output_path': 'renders/final.mp4',
    'options': {'subtitle_burn': True}
})
```

### Was Remotion macht
1. Lädt alle Bilder in `remotion-composer/public/`
2. Rendert Scene Components (text_card, stat_card, etc.)
3. Wendet Spring-Animationen an
4. Mischt Audio (Narration + Music)
5. Brennt Word-Level Captions ein
6. Encodiert zu MP4

### FFmpeg Fallback (NUR wenn Remotion unavailable)
```bash
# NUR als letzter Ausweg:
ffmpeg -f concat -safe 0 -i concat.txt -i narration.wav \
  -vf "scale=1920:1080" -c:v libx264 -c:a aac output.mp4
```

---

## 7. Post-Render Review (MANDATORY)

### 6 Checks nach jedem Render

**6a. Probe:**
```bash
ffprobe -v quiet -print_format json -show_streams output.mp4
```
- Video-Stream vorhanden?
- **Audio-Stream vorhanden?** (wenn NEIN → STOP, fixen!)
- Dauer innerhalb ±5% des Ziels?

**6b. Review Frames extrahieren:**
```python
from tools.analysis.frame_sampler import FrameSampler
FrameSampler().execute({
    'input_path': 'output.mp4',
    'strategy': 'midpoints',
    'output_dir': 'review-frames/'
})
```

**6c. Audio transkribieren:**
```python
from tools.analysis.transcriber import Transcriber
result = Transcriber().execute({'input_path': 'output.mp4', 'model_size': 'base'})
# Wenn 0 Wörter → Audio fehlt! Fixen!
```

**6d. Visuell prüfen:**
- Background passt?
- Bilder scharf?
- Subtitles lesbar?
- Overlays positioniert?
- Intro stark genug? (Social Media Thumbnail)

**6e. Audio prüfen:**
- Narration vollständig? (letztes Wort = letztes Wort im Script?)
- Timing passt? (Narration-Segmente zu Szenen?)
- Musik hörbar?

**6f. Review präsentieren:**
```
Post-render Review:
- File: 63s, 1920x1080, 45MB
- Audio: 148/150 Wörter transkribiert ✓
- Visuals: 9 Szenen, alle korrekt ✓
- Captions: Word-Level Highlight aktiv ✓
- Issues: keine
```

---

## Zero-Key Video (Kostenlos, sofort)

Wenn du **keine API-Keys** hast und sofort ein Video willst:

### 1. Remotion Demo Videos
```bash
cd OpenMontage
make demo  # Rendert 3 vordefinierte Demo-Videos
```

### 2. Eigene Screenshots + Piper TTS
**ABER MIT REMOTION, NICHT FFmpeg-Concat!**

```python
# 1. Screenshots in remotion-composer/public/ kopieren
cp screenshots/*.png remotion-composer/public/

# 2. Edit Decisions mit Remotion Scene Types schreiben
cuts = [
    {"id": "c1", "source": "screenshot.png", "in_seconds": 0, "out_seconds": 6,
     "transform": {"animation": "zoom-in"}},
    {"id": "c2", "source": "", "in_seconds": 0, "out_seconds": 4,  # text_card
     "type": "text_card", "text": "Ihr Feature hier"}
]

# 3. Narration mit Piper generieren
echo "Text" | piper --model de_DE-thorsten-medium.onnx --output_file narration.wav

# 4. Über Remotion rendern (NICHT FFmpeg concat!)
result = vc.execute({'operation': 'render', ...})
```

---

## Prompt-Beispiele die funktionieren

### Feature-Übersicht (Zero-Key)
> "Erstelle ein 60-Sekunden-Feature-Video für OpenAFD Chat. Nutze die bestehenden Screenshots. Zeige: Login, Dashboard, Quellen-Panel, Chat mit Zitaten, Politiker-DB. Nutze Remotion text_card für Feature-Beschreibungen und section_title Overlays. Deutsche Narration mit Piper TTS. Hintergrundmusik von Pixabay."

### Data Explainer (Zero-Key)
> "Mache einen 45-Sekunden animierten Erklärvideo über Vektor-Datenbanken. Nutze DATEN-VISUALISIERUNG — keine Bilder, nur Charts, Stat Cards und Typographie. Remotion BarCharts für Vergleiche, StatCards für Zahlen, Callouts für Key Insights."

### Product Launch ($0.50)
> "Erstelle ein 30-Sekunden Produkt-Launch-Video für eine fiktive App. FLUX-generierte Produktbilder mit Ken Burns, Remotion StatCards für Kennzahlen, OpenAI TTS für Narration, Pixabay Musik."

---

## Häufige Fehler

| Fehler | Warum schlecht | Besser |
|--------|---------------|--------|
| FFmpeg concat statt Remotion | Keine Animation, keine Übergänge | Remotion Components nutzen |
| Piper TTS ohne Kontext | Monoton, roboterhaft | OpenAI/ElevenLabs + Speaker Directions |
| Keine Subtitles | Barrierefreiheit, Engagement | WhisperX → Remotion Captions |
| Keine Musik | Leere Stille, langweilig | Pixabay Music (kostenlos) |
| Director Skills nicht gelesen | Pipeline wird falsch ausgeführt | IMMER zuerst den Skill lesen |
| Kein Post-Render Review | Bugs landen im Video | 6-Check-Review nach jedem Render |
| Screenshots als Slideshow | Kein visueller Wert | Remotion Overlays + Animationen |

---

## Tools-Referenz

### Remotion Components
```
remotion-composer/src/components/
├── HeroTitle.tsx          # Hero-Titelkarte
├── TextCard.tsx           # Animierter Text
├── StatCard.tsx           # Große Zahl + Label
├── CalloutBox.tsx         # Info/Warning/Tip/Quote
├── ComparisonCard.tsx     # Side-by-Side
├── ProgressBar.tsx        # Fortschrittsbalken
├── BarChart.tsx           # Balkendiagramm
├── LineChart.tsx          # Liniendiagramm
├── PieChart.tsx           # Kreisdiagramm
├── KPIGrid.tsx            # Kennzahlen-Dashboard
├── CaptionOverlay.tsx     # Word-Level Subtitles
└── AnimeScene.tsx         # Anime/Ghibli-Stil
```

### Style Playbooks
```
styles/
├── clean-professional.yaml    # Corporate, Bildung
├── flat-motion-graphics.yaml  # Social Media, TikTok
├── minimalist-diagram.yaml    # Technical Deep-Dives
├── premium-minimalist.yaml    # Investor Updates
└── ink-sketch.yaml            # Handgezeichnet, Doodle
```

### Media Profiles
```
youtube_landscape:  1920x1080 (16:9)
youtube_shorts:     1080x1920 (9:16)
tiktok:             1080x1920 (9:16)
instagram_reels:    1080x1920 (9:16)
linkedin:           1920x1080 (16:9)
```
