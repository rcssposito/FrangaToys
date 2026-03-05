-- Migration to add valor_pago_pintor column to vendas table
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS valor_pago_pintor numeric(10,2) DEFAULT 0;
