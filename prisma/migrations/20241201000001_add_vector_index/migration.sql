-- Create vector index for similarity search
CREATE INDEX IF NOT EXISTS "chunk_embedding_idx" ON "chunks" USING ivfflat (embedding vector_cosine_ops);