# Baidu Unlimited-OCR

OpenSIN-Chat and OpenAfD-Chat support Baidu Unlimited-OCR through its OpenAI-compatible vLLM or SGLang server. The model stays outside the Node.js process because the official runtime is a GPU-oriented Python/PyTorch stack. One trusted GPU service may be shared by multiple application deployments.

## Provider selection

`OCR_ENGINE=auto` is the recommended default:

1. A configured Unlimited-OCR endpoint (`UNLIMITED_OCR_BASE_URL`)
2. NVIDIA NIM when `NVIDIA_NIM_API_KEY` is configured
3. Local Tesseract

`OCR_ENGINE=unlimited`, `nim`, or `tesseract` forces the corresponding first-choice provider. In auto mode, an unset Unlimited-OCR URL is not probed, avoiding needless network delays. Set `UNLIMITED_OCR_AUTO_DISCOVER=true` only when the backend-default localhost URL should be discovered automatically.

## Recommended vLLM deployment

The repository includes a pinned optional Compose overlay using the official `vllm/vllm-openai:unlimited-ocr` image. It applies the required model recipe: `baidu/Unlimited-OCR`, trusted model code, the Unlimited-OCR n-gram logits processor, disabled prefix and multimodal caches, authenticated `/v1` requests, and private Compose networking.

Generate a unique API key and save it in the deployment `.env`:

```bash
openssl rand -hex 32
```

Store the result as `UNLIMITED_OCR_API_KEY=...`. Never commit that `.env` file.

### OpenSIN-Chat

```bash
cd platform/containers/compose
docker compose \
  -f docker-compose.yml \
  -f docker-compose.production.yml \
  -f docker-compose.unlimited-ocr.yml \
  up -d
```

### OpenAfD-Chat single-node

```bash
cd docker
docker compose \
  -f docker-compose.yml \
  -f docker-compose.unlimited-ocr.yml \
  up -d
```

### OpenAfD-Chat PostgreSQL/Redis deployment

```bash
cd docker
docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.prod.unlimited-ocr.yml \
  up -d
```

The first start downloads the model and may remain inside the healthcheck start period for several minutes. Model files persist in the named `unlimited-ocr-hf-cache` volume. The host port defaults to `127.0.0.1:18080`; application traffic uses the private address `http://unlimited-ocr:8000/v1`.

The official recipe reports that BF16 can fit in about 8 GB VRAM, but practical capacity depends on page size, concurrency, output length, and GPU architecture. Deployment controls:

```dotenv
UNLIMITED_OCR_TENSOR_PARALLEL_SIZE=1
UNLIMITED_OCR_GPU_MEMORY_UTILIZATION=0.90
UNLIMITED_OCR_PORT=18080
HF_TOKEN=
```

## External or shared GPU endpoint

For a GPU host outside the application Compose network:

```dotenv
OCR_ENGINE=auto
UNLIMITED_OCR_BACKEND=vllm
UNLIMITED_OCR_BASE_URL=https://trusted-gpu-host.example/v1
UNLIMITED_OCR_MODEL=baidu/Unlimited-OCR
UNLIMITED_OCR_API_KEY=<secret>
UNLIMITED_OCR_TIMEOUT_MS=1200000
UNLIMITED_OCR_MAX_TOKENS=8192
UNLIMITED_OCR_PAGES_PER_REQUEST=8
UNLIMITED_OCR_PDF_DPI=300
```

Use a private network, VPN, reverse proxy, or strict firewall allow-list. vLLM API keys protect OpenAI-compatible routes but not every diagnostic endpoint exposed by the server, so never expose the raw vLLM port publicly. Official guidance: `https://docs.vllm.ai/en/latest/usage/security/`.

## Live verification

After the service is healthy:

```bash
UNLIMITED_OCR_BASE_URL=http://127.0.0.1:18080/v1 \
UNLIMITED_OCR_API_KEY=<same-secret> \
yarn ocr:unlimited:check
```

The check validates `/v1/models`, submits the included test image, and fails unless the model recognizes `OPEN SIN OCR 2026`. Add `--health-only` to skip inference.

## PDF behavior

Complete PDF pages are rendered at 300 DPI through Poppler (`pdfinfo` and `pdftoppm`) before inference. Up to eight pages are sent together by default. Stable page markers are requested and mapped back to individual RAG documents. If a multi-page response lacks complete markers, that chunk is retried page by page.

The vLLM client applies the required literal `<image>` prompt prefix, `skip_special_tokens=false`, and `vllm_xargs` with `ngram_size=35`. Grounding coordinates are removed while referenced text is preserved. SGLang remains supported with its backend-specific `images_config`, `custom_params`, and optional serialized logit processor.

## Fallback and failure behavior

- Endpoint discovery is cached briefly to avoid repeated probes.
- Explicit `unlimited` mode falls back to local Tesseract if the service is unavailable.
- `auto` mode proceeds from Unlimited-OCR to NIM to Tesseract.
- Native PDF parsing failures trigger OCR recovery instead of discarding the upload.
- Partial multi-page results retain correct page numbers and metadata.

Unlimited-OCR is MIT licensed by Baidu. This integration communicates with the model server and does not vendor model weights or upstream runtime source code. Official recipe: `https://recipes.vllm.ai/baidu/Unlimited-OCR`.
