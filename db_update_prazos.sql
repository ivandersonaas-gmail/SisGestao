-- SisGestão SQL Migration - Indicadores de Desempenho e Feriados
-- COLE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE E CLIQUE EM RUN.

-- 1. Adicionar coluna prazo_legal_dias na tabela process_types (com fallback de 60 dias)
ALTER TABLE public.process_types 
ADD COLUMN IF NOT EXISTS prazo_legal_dias INT DEFAULT 60;

-- 2. Atualizar prazos padrão para Loteamentos e Condomínios (180 dias)
UPDATE public.process_types 
SET prazo_legal_dias = 180 
WHERE name ILIKE '%condominio%' OR name ILIKE '%loteamento%';

-- 3. Criar tabela de feriados
CREATE TABLE IF NOT EXISTS public.feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date UNIQUE NOT NULL,
  nome text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (Row Level Security) e permitir acesso total para fins de teste
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos os autenticados" 
ON public.feriados FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir escrita para administradores" 
ON public.feriados FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
