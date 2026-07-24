# Issue: OpenAFD Chat Overview Video — Katastrophale Qualität

## Datum: 2026-07-20

## Was passiert ist

Wir haben versucht, ein 60-Sekunden-Overview-Video für OpenAFD Chat mit OpenMontage zu erstellen. Das Ergebnis war **völlig unbrauchbar** — ein Slideshow mit statischen Screenshots und einer langsamen deutschen Sprachausgabe.

## Was schiefgelaufen ist (Root Causes)

### 1. Pipeline komplett ignoriert
OpenMontage hat ein **Pipeline-System** mit 7 Stufen: Research → Proposal → Script → Scene Plan → Assets → Edit → Compose. Wir haben **alle Stufen übersprungen** und direkt Assets + Compose gemacht.

**Fehler:** Kein Research, kein Proposal, kein Script-Director, kein Scene-Director gelesen.

### 2. Keine Remotion-Komposition verwendet
OpenMontage nutzt **Remotion** für animierte Szenen:
- `hero_title` — animierte Titelkarten mit Spring-Animation
- `text_card` — animierter Text mit Eingangsanimation
- `stat_card` — große Zahlen mit Count-Up-Animation
- `callout` — hervorgehobene Erklärboxen
- `comparison` — Side-by-Side-Vergleiche
- `section_title` — kleine Sektions-Labels
- `stat_reveal` — Eckige Statistik-Badges

**Wir haben:** FFmpeg concat mit statischen PNGs. Null Animation. Null Übergänge. Null Effekte.

### 3. Keine Text-Overlays
Jede Sektion hätte:
- **Section Title** oben links (z.B. "Sicherheit & Datenschutz")
- **Stat Reveal** für Schlüsselzahlen
- **Hero Title** für Intro/Outro

**Wir haben:** Gar nichts. Nur das rohe Screenshot.

### 4. Keine Übergänge zwischen Szenen
Remotion unterstützt: `fade`, `dissolve`, `slide-left`, `wipe`. Jede Sektion braucht einen sauberen Übergang.

**Wir haben:** Harte Schnitte. 0 Sekunden Übergang.

### 5. Keine Subtitles
OpenMontage generiert **word-level Captions** via WhisperX und brennt sie als animierte Wort-für-Wort-Highlights ein.

**Wir haben:** Keine Untertitel.

### 6. Keine Musik
Hintergrundmusik ist **mandatory** im Pipeline. OpenMontage sucht automatisch Royalty-Free Musik via Pixabay.

**Wir haben:** Stille zwischen den Sektionen.

### 7. TTS war schlecht
Piper TTS ist ein lokales, Frei-Stimme-Modell. Es klingt monoton und roboterhaft.

**Besser:** OpenAI TTS (`onyx` oder `nova`) oder ElevenLabs für natürlichere Sprache.

### 8. Timing war falsch
Die Narration-Audio-Segmente wurden nicht synchron zu den Screenshots abgespielt. Das Narration-Asset musste manuell mit `adelay` gepadding werden — ein Zeichen dafür, dass die Komposition falsch aufgebaut war.

## Was richtig hätte sein müssen

### Skill-Lesen vor jedem Schritt
Jede Stufe hat einen **Director Skill**:
- `skills/pipelines/explainer/proposal-director.md` — Konzepte entwerfen
- `skills/pipelines/explainer/script-director.md` — Drehbuch schreiben
- `skills/pipelines/explainer/scene-director.md` — Szenen planen
- `skills/pipelines/explainer/asset-director.md` — Assets generieren
- `skills/pipelines/explainer/compose-director.md` — Komponieren

### Remotion-Components statt FFmpeg-Concat
Statt statische Bilder aneinander zu hängen:
1. Jede Sektion als **Remotion Scene** (hero_title, text_card, stat_card, etc.)
2. Screenshots als **Hintergrund** mit Ken Burns Animation
3. **Text-Overlays** für Feature-Beschreibungen
4. **Spring-Animationen** für Eingänge
5. **Fade/Dissolve-Übergänge** zwischen Szenen

### Audio-Mixing in Remotion
Remotion mischt Audio **nativ**:
```json
{
  "audio": {
    "narration": {"src": "narration.mp3", "volume": 1.0},
    "music": {"src": "music.mp3", "volume": 0.08, "fadeInSeconds": 1.5}
  }
}
```

Kein externes FFmpeg-Mixing nötig.

## Kosten des Fehlers

- **Zeit:** ~30 Minuten für ein unbrauchbares Ergebnis
- **Geld:** $0 (Piper + FFmpeg sind kostenlos)
- **Vertrauen:** Das Video wurde ins GitHub-Repo gepusht und sieht amateurhaft aus

## Empfehlung

1. **Niemals die Pipeline überspringen.** Jede Stufe existiert aus einem Grund.
2. **Immer die Director Skills lesen.** Sie erklären WAS zu tun ist und WIE.
3. **Remotion verwenden**, nicht FFmpeg-Concat.
4. **Subtitles sind mandatory**, nicht optional.
5. **Musik ist mandatory**, nicht optional.
6. **Besseres TTS** verwenden (OpenAI/ElevenLabs statt Piper).
