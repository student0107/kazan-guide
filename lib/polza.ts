import OpenAI from "openai";

export function createPolzaClient() {
  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) {
    throw new Error("Задайте POLZA_API_KEY");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://polza.ai/api/v1",
  });
}

export function getPolzaModel() {
  return process.env.POLZA_MODEL ?? "openai/gpt-4o-mini";
}
