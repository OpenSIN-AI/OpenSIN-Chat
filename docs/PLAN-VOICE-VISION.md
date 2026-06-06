# Plan: Voice (TTS/STT) & Vision

## Ziel
Ermögliche Nutzern, mit dem Assistenten per Sprache zu sprechen (STT) und sprachlich zu antworten (TTS). Unterstütze auch Bild-Eingabe im Chat (Vision).

## Scope
- **STT** (Speech-to-Text): Audio → Text
- **TTS** (Text-to-Speech): Text → Audio
- **Vision**: Bilder in Chat hochladen, analyisieren, zitieren
- UI: Chat-Input mit Mikrofon-Button, Sprach-Ausgabe für Responses
- Backend: Audio-Encoding, API-Aufrufe, Multimodal-Support

---

## Phase 1: Datenbank-Schema

### Messages-Erweiterung
```sql
ALTER TABLE messages ADD COLUMN
  audio_url TEXT,               -- URL zu Audio-Response
  media_attachments JSONB;      -- [{type:'image', url:'...', alt:'...'}]

CREATE TABLE audio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  text_hash VARCHAR(64),        -- SHA256(text)
  audio_url TEXT,
  provider TEXT,                -- 'openai', 'elevenlabs', 'google'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 2: Frontend-Audio-Komponenten

### Browser APIs
- **Web Audio API** für Aufnahme
- **getUserMedia()** für Mikrofon-Zugriff
- **AudioContext** für Playback, Visualisierung
- **Fetch** für Audio-Upload

### Komponenten
```
components/
  audio/
    microphone-button.tsx       -- Record/Stop UI
    audio-visualizer.tsx        -- Waveform während Aufnahme
    audio-player.tsx            -- Playback für TTS-Response
    image-upload.tsx            -- Vision: Bild-Input
```

### `microphone-button.tsx`
```tsx
'use client'
import { useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

export function MicrophoneButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    const chunks: BlobPart[] = []

    recorder.ondataavailable = (e) => chunks.push(e.data)
    recorder.onstop = () => {
      const audio = new Blob(chunks, { type: 'audio/webm' })
      uploadAndTranscribe(audio)
    }

    recorder.start()
    setMediaRecorder(recorder)
    setRecording(true)
  }

  const stopRecording = () => {
    mediaRecorder?.stop()
    setRecording(false)
  }

  return (
    <button onClick={recording ? stopRecording : startRecording}>
      {recording ? <MicOff /> : <Mic />}
    </button>
  )
}
```

---

## Phase 3: STT (Speech-to-Text) Backend

### Neue Route: `app/api/transcribe/route.ts`
```ts
export async function POST(req: Request) {
  const formData = await req.formData()
  const audioFile = formData.get('audio') as File

  // Option 1: OpenAI Whisper API
  const transcript = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
  })

  // Option 2: Google Speech-to-Text (für bessere Mehrsprachigkeit)
  // Option 3: Azure Speech Services

  return Response.json({ transcript: transcript.text })
}
```

### Client Upload
```ts
async function uploadAndTranscribe(audioBlob: Blob) {
  const fd = new FormData()
  fd.append('audio', audioBlob, 'audio.webm')

  const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
  const { transcript } = await res.json()
  
  onTranscript(transcript) // → Chat-Input ausfüllen
}
```

---

## Phase 4: TTS (Text-to-Speech) Backend

### Neue Route: `app/api/tts/route.ts`
```ts
export async function POST(req: Request) {
  const { text, workspaceId } = await req.json()

  // Check Cache
  const cached = await query(
    `SELECT audio_url FROM audio_cache WHERE text_hash = SHA256($1) LIMIT 1`,
    [text]
  )
  if (cached.length > 0) {
    return Response.json({ audioUrl: cached[0].audio_url })
  }

  // Generate
  const audio = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy', // Nova, Shimmer, etc.
    input: text,
  })

  // Upload zu Blob/S3
  const audioUrl = await uploadAudio(Buffer.from(audio))

  // Cache
  await query(
    `INSERT INTO audio_cache (workspace_id, text_hash, audio_url, provider)
     VALUES ($1, SHA256($2), $3, 'openai')`,
    [workspaceId, text, audioUrl]
  )

  return Response.json({ audioUrl })
}
```

### Chat-Route Integration
```ts
// In onFinish:
if (workspace.tts_enabled) {
  const { audioUrl } = await fetch('/api/tts', {
    method: 'POST',
    body: JSON.stringify({ text: assistantText, workspaceId })
  }).then(r => r.json())
  
  // Speichere audio_url in messages
}
```

### Audio Player
```tsx
<audio src={message.audioUrl} controls />
```

---

## Phase 5: Vision (Bild-Eingabe)

### Message-Typ für Multimodal
```ts
interface UIMessage {
  role: 'user' | 'assistant'
  parts: (
    | { type: 'text'; text: string }
    | { type: 'image'; image: string; mimeType: string } // Base64 oder URL
    | { type: 'audio'; audio: string } // Base64 oder URL
  )[]
}
```

### Image Upload Component
```tsx
import { Image as ImageIcon } from 'lucide-react'

export function ImageUploadButton({ onImageAdded }: { onImageAdded: (imageData: string) => void }) {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      onImageAdded(base64)
    }
    reader.readAsDataURL(file)
  }

  return (
    <label className="cursor-pointer">
      <ImageIcon className="size-5" />
      <input type="file" accept="image/*" onChange={handleChange} hidden />
    </label>
  )
}
```

### Chat Input Integration
```tsx
const [images, setImages] = useState<string[]>([])

const sendMessage = async () => {
  const parts: UIMessage['parts'] = [
    { type: 'text', text: input }
  ]

  images.forEach(img => {
    parts.push({
      type: 'image',
      image: img,
      mimeType: 'image/jpeg' // Detect from file
    })
  })

  await sendMessage({ parts }, { ... })
}
```

### Backend: Vision via AI SDK
```ts
// In chat route, convertToModelMessages() unterstützt bereits image parts
// AI SDK 6 mit `generateText()` sendet Parts automatisch an den Provider

const result = streamText({
  model,
  messages: await convertToModelMessages(messages), // Parts werden konvertiert
})
```

---

## Phase 6: Settings & Controls

### Workspace Settings Extension
```tsx
// In workspace-settings-dialog
<div>
  <Label>Audio Settings</Label>
  <Checkbox label="Enable Text-to-Speech" />
  <Select label="TTS Voice">
    <Option>Alloy</Option>
    <Option>Nova</Option>
    <Option>Shimmer</Option>
  </Select>
</div>

<div>
  <Label>Vision Settings</Label>
  <Checkbox label="Enable Image Upload" />
  <Checkbox label="Allow Vision Analysis" />
</div>
```

### Schema Update
```sql
ALTER TABLE workspaces ADD COLUMN
  tts_enabled BOOLEAN DEFAULT true,
  tts_voice TEXT DEFAULT 'alloy',
  vision_enabled BOOLEAN DEFAULT true;
```

---

## Phase 7: Testing & Optimization

### Browser Permissions
- [ ] Microphone permission request & handling
- [ ] HTTPS requirement für getUserMedia()
- [ ] Fallback für Browser ohne Web Audio API

### Performance
- [ ] Audio caching pro Workspace
- [ ] Worker für STT-Upload (nicht blockierend)
- [ ] Lazy-load Audio-Player nur bei Bedarf
- [ ] Audio-Kompression vor Upload

### Accessibility
- [ ] Captions für Audio (auto-generated)
- [ ] Keyboard shortcut: `Ctrl+M` zum Mic-Toggle
- [ ] ARIA-Labels für Audio-Controls

---

## Dependencies
- Existierendes AI SDK 6 (Vision bereits unterstützt)
- `browser-audio-worklet` (optional, für erweiterte Audio-Verarbeitung)
- OpenAI API Key (Whisper + TTS)
- Optional: ElevenLabs API (höherwertige TTS), Google Cloud Speech

---

## Geschätzter Aufwand
- STT Backend + Frontend: 2–3h
- TTS Backend + Frontend: 2–3h
- Vision Integration: 1–2h (AI SDK macht meiste Arbeit)
- Audio Caching & Optimization: 1h
- Settings UI: 1h
- Testing: 1–2h
- **Total: ~8–12h**

## Risiken
- Browser-Kompatibilität (ältere Safari, IE)
- Audio-Codec-Unterstützung (WebM vs MP3 vs WAV)
- Latenz bei Live-Transcription
- CORS für Audio-Playback
