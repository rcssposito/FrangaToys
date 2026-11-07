-- Add per-sale production consumption snapshots to vendas (used for custom/Outros items so catalog figures_meta stays clean)
ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS resina_kg_snapshot numeric(10,3),
ADD COLUMN IF NOT EXISTS horas_impressao_snapshot numeric(10,2),
ADD COLUMN IF NOT EXISTS horas_pintura_snapshot numeric(10,2);

