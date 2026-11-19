/** Shared embedding settings (browser-safe) so panel display matches what the server uses. */
export const EMBEDDING = {
  model: "google/gemini-embedding-2",
  provider: "Lovable AI Gateway",
  dimensions: 768,
  store: "PostgreSQL pgvector · vector(768)",
  metric: "Kosinüs benzerliği (match_kb)",
  chunkSize: 1200,
} as const;
