# Changelog

## [13/01/2026] - Correções Importantes

### 🔧 Correção: Multiplicador de Rollover não Respeitava Configuração

**Problema:**
- Quando um usuário se registrava, o `rollover_multiplier` vinha sempre como **2** (hardcoded)
- Mesmo alterando o valor de `default_rollover_multiplier` nas configurações (settings) para 3, os novos usuários continuavam recebendo 2

**Causa:**
- O código de registro (tanto público quanto admin) estava usando valores fixos ao invés de buscar da tabela `settings`
- Linhas afetadas:
  - `src/auth/auth.service.ts:163` (registro público)
  - `src/lobster/lobster.service.ts:196` (registro admin)

**Solução:**
- Modificado para buscar as configurações de rollover da tabela `settings`:
  - `default_rollover_active` (se rollover está ativo)
  - `default_rollover_multiplier` (multiplicador padrão)
- Agora os novos usuários recebem as configurações corretas do sistema

**Arquivos Modificados:**
- `src/auth/auth.service.ts` - Registro de usuário público
- `src/lobster/lobster.service.ts` - Criação de usuário pelo admin

**Como Configurar:**
1. Acesse o painel admin
2. Vá em Configurações (Settings)
3. Altere `default_rollover_multiplier` para o valor desejado (ex: 3)
4. Todos os novos usuários registrados a partir de agora receberão esse multiplicador

**Retroativo:**
Essa mudança **não afeta** usuários já existentes. Para atualizar usuários existentes:
```sql
-- Atualizar todos os usuários para o novo multiplicador
UPDATE users
SET rollover_multiplier = 3
WHERE rollover_multiplier = 2;

-- Ou atualizar apenas usuários específicos
UPDATE users
SET rollover_multiplier = 3
WHERE id IN (1, 2, 3);
```

---

## [13/01/2026] - Novas Features

### ✨ Novas Rotas de Afiliação para Admin

**Rota 1: Listar Afiliadores**
- **Endpoint:** `GET /lobster/affiliates`
- **Descrição:** Lista todos os usuários que possuem pelo menos 1 afiliado
- **Retorna:**
  - Dados completos do afiliador
  - Total de indicados
  - Configurações de jump
  - Taxas de CPA e revshare

**Rota 2: Árvore de Afiliação**
- **Endpoint:** `GET /lobster/affiliates/:id/tree`
- **Descrição:** Retorna a árvore completa de afiliados de um usuário específico
- **Retorna:**
  - Dados do afiliador principal
  - Lista de N1 (indicações diretas)
  - Lista de N2 (indicações indiretas - nível 2)
  - Lista de N3 (indicações indiretas - nível 3)
  - Resumo de comissões por usuário
  - Total de comissões CPA e revshare

**Arquivos:**
- `src/lobster/lobster.controller.ts` - Endpoints
- `src/lobster/lobster.service.ts` - Lógica de negócio

---

## [13/01/2026] - Correções de Infraestrutura

### 🔧 Correção: Erro de Sequência no Registro de Usuários

**Problema:**
- Erro ao registrar: `Unique constraint failed on the fields: (id)`
- Código P2002

**Solução:**
- Criado script `fix-all-sequences.sql` para corrigir sequências desincronizadas
- Criado arquivo `TROUBLESHOOTING.md` com documentação completa

**Como Usar:**
```bash
# Corrigir todas as sequências
PGPASSWORD="senha" psql -h host -p porta -U user -d database -f fix-all-sequences.sql
```

---

## Observações

- Sempre execute `npx prisma generate` após modificar o schema do Prisma
- Mantenha backups antes de executar scripts SQL de correção
- Teste em ambiente de desenvolvimento antes de aplicar em produção
