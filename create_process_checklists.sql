-- Script de criação da tabela de auditorias no Supabase

CREATE TABLE IF NOT EXISTS public.process_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  checklist_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT process_checklists_process_id_key UNIQUE (process_id)
);

-- Habilitar RLS
ALTER TABLE public.process_checklists ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso para usuários autenticados
CREATE POLICY "Permitir tudo para usuários autenticados" 
ON public.process_checklists 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
