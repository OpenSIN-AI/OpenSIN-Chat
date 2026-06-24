# Third-Party Components

OpenSIN Chat is a sovereign, independent AI platform (MIT-licensed). It builds on
architectural foundations from earlier open-source work, which we gratefully acknowledge below.

## Foundational acknowledgments

| Project | License | Usage |
|---------|---------|-------|
| [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) | MIT | Architectural foundation that inspired the full-stack structure (frontend, server, collector, vector-DB layer) |
| [Mintplex Labs](https://github.com/Mintplex-Labs) | MIT | Authors of the foundational open-source work |

## Key dependencies

| Project | License | Usage |
|---------|---------|-------|
| [React](https://github.com/facebook/react) | MIT | Frontend UI |
| [Vite](https://github.com/vitejs/vite) | MIT | Frontend build tooling |
| [Vitest](https://github.com/vitest-dev/vitest) | MIT | Frontend test runner |
| [Express](https://github.com/expressjs/express) | MIT | Server API framework |
| [Jest](https://github.com/jestjs/jest) | MIT | Server test runner |
| [Prisma](https://github.com/prisma/prisma) | Apache-2.0 | Database ORM |
| [SWR](https://github.com/vercel/swr) | MIT | React data fetching |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT | Utility-first CSS |
| [pdfjs-dist](https://github.com/mozilla/pdf.js) | Apache-2.0 | PDF text extraction |
| [PDFKit](https://github.com/foliojs/pdfkit) | MIT | PDF report generation |

## External data sources

| Source | Usage |
|--------|-------|
| [Bundestag Open Data API](https://www.bundestag.de/services/opendata) | Politician data, speeches, votes |
| [Abgeordnetenwatch API](https://www.abgeordnetenwatch.de/) | Constituency, committees, side jobs |
| [SerpAPI](https://serpapi.com/) / DuckDuckGo | Web search in research pipeline |

## Provider integrations

The project supports LLM, embedding, and vector-DB providers via their respective official SDKs and APIs. See `docs/API.md` and `docs/DATA-SOURCES.md` for details.

---

For a full dependency list, see the individual `package.json` files in `frontend/`, `server/`, and `collector/`.
