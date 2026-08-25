import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { embedding } from "../../config/chroma";
import chromadb = require("chromadb");
import { ChatOllama } from "@langchain/ollama";
import { Document } from "@langchain/core/documents";
import e = require("express");

// export async function fetchAILaws() {
//   const apiKey = process.env.AI_LAW_TRACKER_API_KEY;
//   if (!apiKey) throw new Error("AI_LAW_TRACKER_API_KEY is missing");

//   let allLaws: any[] = [];
//   let offset = 0;
//   const limit = 25;

//   while (offset <= 200) {
//     const response = await fetch(
//       `https://ai-law-tracker.com/api/v1/laws?limit=${limit}&offset=${offset}`,
//       { headers: { "X-API-Key": apiKey } },
//     );

//     if (!response.ok) {
//       throw new Error(`AI Law Tracker API error: ${response.status}`);
//     }

//     const { data, meta } = await response.json();
//     allLaws = allLaws.concat(data);

//     offset += limit;
//     if (data.length === 0 || offset >= meta.total) break;
//   }

//   console.log("Total laws fetched:", allLaws.length);
//   return allLaws;
// }
async function fetchJurisdictions() {
  const apiKey = process.env.AI_LAW_TRACKER_API_KEY;
  const response = await fetch(
    "https://ai-law-tracker.com/api/v1/jurisdictions",
    { headers: { "X-API-Key": apiKey! } },
  );
  const { data } = await response.json();
  return data;
}

export async function resetCollection() {
  const chromaClient = new chromadb.CloudClient({
    apiKey: process.env.CHROMA_API_KEY!,
    tenant: process.env.CHROMA_TENANT!,
    database: process.env.CHROMA_DATABASE!,
  });
  await chromaClient.deleteCollection({ name: "ai-law-tracker" });
  return { message: "Collection deleted" };
}

export async function fetchAllLaws() {
  const apiKey = process.env.AI_LAW_TRACKER_API_KEY!;
  const jurisdictions = await fetchJurisdictions();

  let allLaws: any[] = [];

  for (const j of jurisdictions) {
    let offset = 0;
    while (offset <= 200) {
      const response = await fetch(
        `https://ai-law-tracker.com/api/v1/laws?jurisdiction=${j.slug}&limit=25&offset=${offset}`,
        { headers: { "X-API-Key": apiKey } },
      );
      if (!response.ok) break;

      const { data, meta } = await response.json();
      allLaws = allLaws.concat(data);

      offset += 25;
      if (data.length === 0 || offset >= meta.total) break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("Total laws fetched:", allLaws.length);
  const uniqueLaws = Array.from(
    new Map(allLaws.map((law) => [law.id, law])).values(),
  );
  console.log("Unique laws after dedup:", uniqueLaws.length);
  return uniqueLaws;
}

export function lawsToText(laws: any[]): string {
  return laws
    .map(
      (law) =>
        `${law.title}. ${law.summary} Jurisdiction: ${law.jurisdiction?.name}. Status: ${law.status}.`,
    )
    .join("\n\n");
}
function safeMeta(value: any, max = 300): string {
  if (value === undefined || value === null) return "";
  return String(value).slice(0, max);
}

export async function ingestLaws() {
  const data = await fetchAllLaws();

  const documents = data.map(
    (law) =>
      new Document({
        pageContent: `${law.title}. ${law.summary} Jurisdiction: ${law.jurisdiction?.name}. Status: ${law.status}.`,
        metadata: {
          title: safeMeta(law.title),
          jurisdiction: safeMeta(law.jurisdiction?.name),
          official_url: safeMeta(law.official_url, 500),
        },
      }),
  );

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  const chunks = await splitter.splitDocuments(documents);

  // const vectorStore = await Chroma.fromDocuments(chunks, embedding, {
  //   collectionName: "ai-law-tracker",
  //   url: "https://api.trychroma.com",
  //   chromaCloudAPIKey: process.env.CHROMA_API_KEY,
  //   clientParams: {
  //     tenant: process.env.CHROMA_TENANT,
  //     database: process.env.CHROMA_DATABASE,
  //   },
  // });
  const chromaClient = new chromadb.CloudClient({
    apiKey: process.env.CHROMA_API_KEY!,
    tenant: process.env.CHROMA_TENANT!,
    database: process.env.CHROMA_DATABASE!,
  });

  const vectorStore = await Chroma.fromDocuments(
    chunks.slice(0, 300),
    embedding,
    {
      collectionName: "ai-law-tracker",
      index: chromaClient,
    },
  );

  const batchSize = 300;
  for (let i = 300; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    await vectorStore.addDocuments(batch);
    console.log(`Added batch: ${i} to ${i + batch.length}`);
  }
  return { chunksCount: chunks.length };
}

export async function queryLaws(question: string) {
  const chromaClient = new chromadb.CloudClient({
    apiKey: process.env.CHROMA_API_KEY!,
    tenant: process.env.CHROMA_TENANT!,
    database: process.env.CHROMA_DATABASE!,
  });

  const vectorStore = await Chroma.fromExistingCollection(embedding, {
    collectionName: "ai-law-tracker",
    index: chromaClient,
  });

  const results = await vectorStore.similaritySearch(question, 3);
  const context = results.map((r) => r.pageContent).join("\n\n");
  const sources = results.map((r) => ({
    title: r.metadata.title,
    jurisdiction: r.metadata.jurisdiction,
    url: r.metadata.official_url,
    text: r.pageContent,
  }));

  const prompt = `Answer the question using ONLY the context below. Follow these rules strictly:
- If a source is labelled a "Bill", it is PROPOSED legislation, not an enacted law. Say so explicitly — never claim "no law exists" just because you only see a bill.
- If the context does not clearly answer the question, say "The available data doesn't clearly cover this" instead of guessing or generalizing.
- Do not make sweeping claims (like "no law exists anywhere") unless the context explicitly supports it.

Context:
${context}

Question: ${question}

Answer:`;
  const llm = new ChatOllama({ model: "llama3.2", temperature: 0 });
  const stream = await llm.stream(prompt);

  return { sources, stream, llm };
}
