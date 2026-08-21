import { Request, Response } from "express";
import {
  fetchAILaws,
  lawsToText,
  ingestLaws,
  queryLaws,
  resetCollection,
} from "./rag.services";

export async function testFetchHandler(req: Request, res: Response) {
  const data = await fetchAILaws();
  const text = lawsToText(data);
  res.type("text/plain").send(text);
}

export async function ingestHandler(req: Request, res: Response) {
  res.json({ message: "Ingestion started — check terminal for progress." });

  ingestLaws()
    .then((result) => console.log("Ingestion complete:", result))
    .catch((err) => console.error("Ingestion failed:", err));
}

export async function queryHandler(req: Request, res: Response) {
  const { question } = req.body;
  const { sources, stream } = await queryLaws(question);

  res.setHeader("Content-Type", "application/x-ndjson");
  res.write(JSON.stringify({ sources }) + "\n");

  for await (const chunk of stream) {
    res.write(JSON.stringify({ token: chunk.content }) + "\n");
  }

  res.end();
}

export async function resetHandler(req: Request, res: Response) {
  const result = await resetCollection();
  res.json(result);
}
