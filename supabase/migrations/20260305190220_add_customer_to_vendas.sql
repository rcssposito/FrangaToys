-- Add customer information to vendas table
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
ADD COLUMN IF NOT EXISTS cliente_contato TEXT;
