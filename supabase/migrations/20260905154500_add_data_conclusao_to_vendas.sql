-- Migration to add data_conclusao column to vendas table for WIP retention tracking
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS data_conclusao timestamp with time zone;
