# 🔐 Guia de Permissões (RBAC 2.0) - Franga Toys

Este documento descreve as responsabilidades e restrições de cada nível de acesso no sistema de gestão.

---

## 👑 Administrador (`admin`)
**Responsabilidade:** Gestão total do sistema e segurança dos dados.
- **Acesso:** Todas as páginas e funcionalidades.
- **Exclusividade:** É o **único** papel autorizado a **excluir** registros em qualquer tela (Vendas, Estoque, Catálogo, Estúdios, etc).
- **Visibilidade:** Acesso total a lucros, custos e gestão de usuários.

---

## 💰 Financeiro (`finance`)
**Responsabilidade:** Auditoria de vendas e gestão de pagamentos.
- **Acesso:** Dashboard, Vendas, Comissões.
- **Permissões:** 
  - Visualiza colunas de **Lucro Líquido** e **Custo Base** na tela de Vendas.
  - Acesso total ao módulo de Comissões.
- **Restrição:** Não pode excluir registros ou gerenciar usuários.

---

## 🎨 Produção (`production`)
**Responsabilidade:** Operação do ateliê e controle de materiais.
- **Acesso:** Kanban de Produção, Estoque.
- **Permissões:**
  - Movimentar cards no Kanban.
  - Gerar **Ordem de Serviço (OS)** para peças em produção.
  - Atualizar níveis de tinta, resina e insumos no Estoque.
- **Restrição:** Não visualiza histórico de vendas ou dados financeiros.

---

## 🛒 Vendas (`sales`)
**Responsabilidade:** Atendimento ao cliente e registro de novos pedidos.
- **Acesso:** Vendas (Nova/Lista), Kanban, Estoque.
- **Restrição de Dados:** **Não visualiza margens de lucro ou custos**. Vê apenas o valor final de venda.
- **Permissões:** Pode acompanhar o status logístico das peças no Kanban.

---

## 📊 Precificação (`pricing`)
**Responsabilidade:** Manutenção do catálogo e custos de estúdio.
- **Acesso:** Catálogo (Figuras), Estúdios, Dashboard.
- **Permissões:**
  - Editar parâmetros técnicos das peças (altura, horas, resina).
  - Configurar custos mensais e qualidades de cada Estúdio.
- **Restrição:** Não acessa fluxo de caixa ou dados de clientes.

---

## 📢 Orçamento / Marketing (`orcamento`)
**Responsabilidade:** Geração de material visual para prospecção.
- **Acesso:** Catálogo (Figuras).
- **Permissões:** 
  - Visualizar detalhes das peças e escalas.
  - Gerar o **Cartão de Orçamento** (Imagem preta e laranja) para envio direto ao cliente.
- **Restrição:** Acesso de leitura (Read-only). Não pode salvar alterações ou ver dados de produção/venda.

---

> [!NOTE]  
> Todas as permissões são validadas tanto no **Middleware** (proteção de rotas) quanto no **UI Components** (esconder botões e colunas).
