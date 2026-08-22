# AI Law Tracker RAG

A RAG (Retrieval-Augmented Generation) system that answers questions about US and EU AI regulations. It pulls live data from the AI Law Tracker API, stores it as searchable vectors in Chroma Cloud, and uses a local LLM (via Ollama) to generate grounded, source-cited answers — streamed live to a React frontend.

## How it works

1. **Fetch** — pulls AI law records from every jurisdiction covered by the AI Law Tracker API (paginated per jurisdiction to bypass the free-tier depth limit), then deduplicates by record ID.
2. **Chunk** — splits each law into overlapping text chunks using LangChain's `RecursiveCharacterTextSplitter`, keeping title/jurisdiction/URL as metadata on every chunk.
3. **Embed & Store** — generates embeddings with Ollama (`nomic-embed-text`) and stores them in a Chroma Cloud collection, batched to stay under quota limits.
4. **Retrieve** — on a question, finds the most relevant chunks via similarity search.
5. **Generate** — streams a real-time answer from a local LLM (`llama3.2` via Ollama), grounded only in the retrieved context, alongside the source laws it used.

## Tech stack

**Backend:** TypeScript, Express, LangChain, Ollama, Chroma Cloud
**Frontend:** React (Vite), react-icons

## Project structure

```
AI-Law-Tracker-RAG/
├── backend/     — Express API (routes → controller → service pattern)
└── client/      — React UI
```

## Setup

**Backend:**

```
cd backend
npm install --legacy-peer-deps
cp .env.example .env   # fill in your API keys
npm run dev
```

**Frontend:**

```
cd client
npm install
npm run dev
```

Requires [Ollama](https://ollama.com) running locally with `nomic-embed-text` and `llama3.2` pulled.

## API Endpoints

| Method | Route         | Description                                                                                         |
| ------ | ------------- | --------------------------------------------------------------------------------------------------- |
| POST   | `/rag/ingest` | Fetches all laws, chunks, embeds, and stores them in Chroma. Runs in the background.                |
| POST   | `/rag/query`  | Takes `{ question }`, streams back `{ sources }` then a token-by-token `{ token }` answer (NDJSON). |
| DELETE | `/rag/reset`  | Clears the Chroma collection.                                                                       |

## Example

```
POST /rag/query
{ "question": "what AI regulations exist in California" }
```

## Notes

- Data source: [AI Law Tracker](https://ai-law-tracker.com) (free tier)
- Vector store: [Chroma Cloud](https://trychroma.com) (free tier)
- Not legal advice — informational only.

```

```
