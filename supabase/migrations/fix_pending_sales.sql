UPDATE vendas 
SET 
  status = 'Aguardando Pagamento',
  status_pagamento = 'Aguardando Pagamento'
WHERE 
  status = 'Pendente/Incompleto' 
  OR status_pagamento = 'Pendente/Incompleto';
