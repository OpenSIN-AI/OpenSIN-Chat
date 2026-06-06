# embedder.doc.md

## What

Embedding utility for politician speeches. Chunks speech text and generates vector embeddings using the existing NativeEmbedder.

## Dependencies

- `server/utils/EmbeddingEngines/native.js` — NativeEmbedder (Xenova/all-MiniLM-L6-v2)
- `server/utils/TextSplitter.js` — text chunking (500 chars, 50 overlap)

## API

- `chunkText(text, metadata)` — split text into embeddable chunks
- `embedText(text)` — embed single text string
- `embedChunks(textChunks)` — embed multiple chunks

## Caveats

- Chunk size 500 chars with 50 overlap — tuned for political speeches (medium-length paragraphs)
- Embedding dimension depends on the configured model (all-MiniLM-L6-v2 = 384 dims)
