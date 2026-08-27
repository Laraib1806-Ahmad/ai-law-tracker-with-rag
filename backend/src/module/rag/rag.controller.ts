import { Request, Response } from "express";
import {
  fetchAllLaws,
  lawsToText,
  ingestLaws,
  queryLaws,
  resetCollection,
} from "./rag.services";

export async function testFetchHandler(req: Request, res: Response) {
  const data = await fetchAllLaws();
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
  const { sources, stream, llm } = await queryLaws(question);

  res.setHeader("Content-Type", "application/x-ndjson");

  const preview = sources.map(({ title, jurisdiction, url }) => ({
    title,
    jurisdiction,
    url,
  }));
  res.write(JSON.stringify({ contextInUse: preview }) + "\n");

  let fullAnswer = "";
  for await (const chunk of stream) {
    fullAnswer += chunk.content;
    res.write(JSON.stringify({ token: chunk.content }) + "\n");
  }

  const verifiedSources = sources.filter((source) => {
    const idMatch = source.title.match(/\d{4}\/\d+/);
    if (idMatch && fullAnswer.includes(idMatch[0])) return true;

    const firstPart = source.title.split(":")[0].trim();
    return (
      firstPart.length > 5 &&
      fullAnswer.toLowerCase().includes(firstPart.toLowerCase())
    );
  });

  res.write(JSON.stringify({ verifiedSources }) + "\n");
  res.end();
}

export async function resetHandler(req: Request, res: Response) {
  const result = await resetCollection();
  res.json(result);
}
