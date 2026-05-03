-- Otimizações e Migrações de Banco de Dados do RAG (NotebookLM + SisGestão)
-- ATENÇÃO: Cole todo esse código no 'SQL Editor' do Supabase e clique em 'Run'.

-- ==========================================
-- PONTO 3: ÍNDICES VETORIAIS DE ALTA PERFORMANCE (HNSW)
-- ==========================================
CREATE EXTENSION IF NOT EXISTS vector;

-- Cria índice HNSW para buscas extremamente rápidas de similaridade por Cosseno
-- (Diminui de Seq Scan O(N) para buscas em frações de ms).
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_hnsw 
ON public.rag_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- ==========================================
-- PONTO 4: BUSCA HÍBRIDA DIRETA NO BANCO (VETORIAL + FULL-TEXT SEARCH)
-- ==========================================
-- Adiciona uma coluna gerada automaticamente para armazenar os tokens de texto (tsvector em português)
ALTER TABLE public.rag_chunks 
ADD COLUMN IF NOT EXISTS fts tsvector 
GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(content, ''))) STORED;

-- Cria o índice GIN para a busca rápida em texto (Palavras exatas / Regex)
CREATE INDEX IF NOT EXISTS idx_rag_chunks_fts_gin 
ON public.rag_chunks 
USING gin (fts);

-- Função RPC Otimizada que une Vetores + Texto Exato usando Algoritmo RRF
CREATE OR REPLACE FUNCTION search_chunks_hybrid(
  query_text text,
  query_embedding vector(384),
  match_count int DEFAULT 5,
  full_text_weight float DEFAULT 1.0,
  semantic_weight float DEFAULT 1.0,
  rrf_k int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic_search AS (
    SELECT 
      rag_chunks.id,
      RANK() OVER (ORDER BY rag_chunks.embedding <=> query_embedding) as rank,
      (1 - (rag_chunks.embedding <=> query_embedding)) as sim
    FROM public.rag_chunks
    ORDER BY rag_chunks.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_search AS (
    SELECT 
      rag_chunks.id,
      RANK() OVER (ORDER BY ts_rank_cd(rag_chunks.fts, websearch_to_tsquery('portuguese', query_text)) DESC) as rank,
      ts_rank_cd(rag_chunks.fts, websearch_to_tsquery('portuguese', query_text)) as ts_sim
    FROM public.rag_chunks
    WHERE rag_chunks.fts @@ websearch_to_tsquery('portuguese', query_text)
    ORDER BY ts_rank_cd(rag_chunks.fts, websearch_to_tsquery('portuguese', query_text)) DESC
    LIMIT match_count * 2
  )
  SELECT 
    c.id,
    c.document_id,
    c.content,
    c.metadata,
    c.chunk_index,
    COALESCE(1.0 / (rrf_k + COALESCE(s.rank, 1000)), 0) * semantic_weight +
    COALESCE(1.0 / (rrf_k + COALESCE(k.rank, 1000)), 0) * full_text_weight AS similarity
  FROM public.rag_chunks c
  LEFT JOIN semantic_search s ON c.id = s.id
  LEFT JOIN keyword_search k ON c.id = k.id
  WHERE s.id IS NOT NULL OR k.id IS NOT NULL
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- ==========================================
-- PONTO 5: CACHE SEMÂNTICO
-- ==========================================
-- Criação da tabela para armazenar perguntas já respondidas com alta fidelidade
CREATE TABLE IF NOT EXISTS public.rag_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  question_embedding vector(384) NOT NULL,
  answer text NOT NULL,
  sources jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Índice no cache para responder instantaneamente se a pergunta for a mesma
CREATE INDEX IF NOT EXISTS idx_rag_cache_embedding_hnsw 
ON public.rag_cache 
USING hnsw (question_embedding vector_cosine_ops);
