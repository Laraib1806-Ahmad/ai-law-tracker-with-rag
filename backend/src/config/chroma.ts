import { OllamaEmbeddings } from "@langchain/ollama";

export const embedding = new OllamaEmbeddings({
  model: "nomic-embed-text",
});
