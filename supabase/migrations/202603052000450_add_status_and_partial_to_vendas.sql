-- Add pending payment fields to vendas table
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'Pendente/Incompleto',
ADD COLUMN IF NOT EXISTS valor_pago_parcial NUMERIC(10,2);
