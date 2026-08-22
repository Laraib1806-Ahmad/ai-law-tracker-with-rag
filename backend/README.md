# AI Law Tracker RAG

A RAG (Retrieval-Augmented Generation) system that answers questions about AI regulations using the AI Law Tracker API, LangChain, Ollama, and Chroma Cloud.

## Stack
- TypeScript + Express
- LangChain (text splitting, embeddings)
- Ollama (local embeddings + LLM)
- Chroma Cloud (vector database)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in your keys
3. `npm run dev`

## Endpoints
- `POST /rag/ingest` — fetches all AI laws, chunks them, and stores them in Chroma
- `POST /rag/query` — takes a `question`, returns relevant sources and a streamed AI answer
- `DELETE /rag/reset` — clears the collection

## Example
POST /rag/query
{ "question": "what AI regulations exist in California" }