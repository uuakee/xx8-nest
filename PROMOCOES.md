# Promoções Planejadas (Visão Geral)

Este arquivo lista as promoções possíveis de implementar na plataforma, para servir como mapa mental das regras de negócio. Não é documentação final, apenas um checklist de ideias e lógica.

## 1. Programa VIP “lifetime”

- **Base de dados**
  - Usa `User.vip` como nível atual.
  - Usa `VipLevel` com:
    - `id_vip` (1..N)
    - `goal` (volume acumulado necessário para atingir o nível)
    - `bonus` (bônus de upgrade)
    - `weekly_bonus` (bônus semanal por nível)
    - `monthly_bonus` (bônus mensal por nível)
  - Usa `VipHistory` com:
    - `kind` = `"upgrade" | "weekly" | "monthly"` para registrar o tipo de bônus.

- **Lógica principal**
  - Acompanhar volume acumulado de apostas/turnover do usuário.
  - Ao atingir `goal` de um nível, subir `User.vip` e registrar `VipHistory` (kind `upgrade`) e crédito do `bonus`.
  - Jobs semanais/mensais:
    - Para cada usuário, olhar `User.vip` e pagar `weekly_bonus`/`monthly_bonus`.
    - Registrar em `VipHistory` com `kind = "weekly"` ou `"monthly"`.
    - Aplicar rollover 1x antes de liberar saque.

## 2. Programa de afiliados multi-nível

- **Base de dados**
  - Cadeia de indicação:
    - `User.affiliate_code`
    - `User.invited_by_user_id` + relações `inviter`/`invitees` (árvore infinita N1..N5+).
  - Config padrão:
    - `DefaultAffiliateBonus` com `cpa_level_1..3`, `revshare_level_1..3`, etc.
  - Histórico:
    - `AffiliateHistory` com:
      - `user_id` (afiliado que recebe)
      - `affiliate_user_id` (indicado que gerou a comissão)
      - `amount`, `cpa_level`, `revshare_level`, `type`.
  - Saldos:
    - `User.affiliate_balance` acumulando tudo.

- **Lógicas possíveis**
  - CPA por níveis (N1..N5) usando `cpa_level`.
  - Revshare por níveis usando `revshare_level`.
  - Bônus especiais por evento (ex: depósito mínimo, volume de apostas, etc) com `type` customizado.

## 3. Cashback de depósito (afiliado)

Promoção do tipo:
- Novo usuário indicado:
  - Ao somar R$300 em depósitos, afiliado ganha R$3.
- Usuário ativo:
  - Ao somar 3.000 de volume de apostas, afiliado ganha R$10.
- Cashback:
  - 1% sobre todos os depósitos dos indicados.

- **Base de dados**
  - `Deposit`:
    - `user_id`, `amount`, `created_at`.
  - `User.invited_by_user_id` para achar o afiliado.
  - `AffiliateHistory` para registrar eventos:
    - `type` = `"new_user_bonus"`, `"active_user_bonus"`, `"deposit_cashback"`.
  - `User.affiliate_balance` para somar valores.

- **Lógica principal**
  - Em cada `Deposit`:
    - Calcular cashback 1% para o afiliado (`deposit.amount * 0.01`).
    - Somar depósitos do indicado; ao atingir R$300, pagar bônus de “novo usuário”.
  - Com volume de apostas (quando existir `Bet` ou similar):
    - Somar turnover do indicado; ao atingir 3.000, pagar bônus de “usuário ativo”.

## 4. Promo de nível com check-in diário (7 dias)

Exemplo: nível baseado em volume dos últimos 7 dias (Ferro, Bronze, Prata, Ouro, Platina, Diamante) e bônus por Dia 1..7.

- **Base de dados**
  - `LevelPromoTier`:
    - `name` (Ferro, Bronze, etc).
    - `min_volume` (turnover 7 dias para estar no tier).
  - `LevelPromoBonus`:
    - `tier_id`, `day_index` (1..7), `bonus_value`.
  - `LevelPromoProgress`:
    - `user_id`, `current_day`, `last_checkin_at`.

- **Lógica principal**
  - Calcular volume de apostas nos últimos 7 dias (quando existir model de bets).
  - Determinar `LevelPromoTier` atual do usuário.
  - No momento do “claim”:
    - Validar se passou da virada de dia (21:00 BR).
    - Se dia quebrado, resetar `current_day` para 1.
    - Buscar `LevelPromoBonus` do tier e `current_day`.
    - Creditar bônus (com rollover 1x) e avançar `current_day`.

## 5. Compensação semanal (cashback por prejuízo)

Promo do tipo:
- Janela semanal fixa (ex: domingo 21:00 → domingo 21:00).
- Calcular “lucro esta semana” (ganhos – perdas).
- Se prejuízo, aplicar percentuais por faixa de perda:
  - ≥ 100 → 3%
  - ≥ 1.000 → 5%
  - …até faixa máxima (ex: ≥ 10.000.000 → 50%).

- **Base de dados necessária (ainda não criada)**
  - Model para registrar bets/resultados ou PnL semanal (ex: `Bet` ou `UserWeeklyPnL`).
  - Model para histórico de compensação semanal (ex: `WeeklyCompensation` com:
    - `user_id`, `week_start`, `week_end`, `loss`, `rate`, `amount`, `status`).

- **Pontos de lógica**
  - Job semanal calcula PnL por usuário.
  - Aplica tabela de percentuais.
  - Credita cashback (com rollover 1x) e registra histórico para não pagar duas vezes.

## 6. Promoções de interface (banners / cards clicáveis)

Objetivo: listar promoções com:
- Nome
- Imagem
- Link de redirect (URL interna/externa)
- Status (ativo/inativo)
- Ordem de exibição

- **Model sugerido (ainda não criado)**
  - `Promotion`:
    - `name`, `image_url`, `target_url`
    - `is_active`
    - `sort_order`
    - `starts_at`, `ends_at`

- **Uso**
  - API lista promoções ativas ordenadas (`sort_order`).
  - Front exibe cards; ao clicar, redireciona para `target_url`.

## 7. Outros elementos já existentes que podem virar promo

- **Baús (Chest / ChestWithdrawal)**
  - `Chest` define requisitos (referrals, depósito, bet) e bônus.
  - `ChestWithdrawal` registra resgates.
  - Dá para criar campanhas de “baú diário” ou “baú por metas”.

- **ReedemCode**
  - Códigos promocionais com:
    - `code`, `max_collect`, `collected_count`, `is_active`.
  - Útil para campanhas de “código de bônus”.

- **Mensage**
  - Mensagens simples de sistema, sem link/imagem estruturados.



--

Resumo do que foi implementado:

  1. ✅ Nova Tabela RolloverRequirement

  - Criado model no Prisma Schema com auditoria completa
  - Migration SQL gerada em prisma/migrations/20260113000000_add_rollover_audit_system/migration.sql
  - Rastreia todos os rollovers: depósitos regulares, bônus e manuais
  - Campos principais: amount_required, amount_completed, source_type, status

  2. ✅ Configurações no Settings

  Três novos campos adicionados:
  - default_rollover_active (Boolean, default: true)
  - default_rollover_multiplier (Decimal, default: 2.00)
  - new_user_roullete (Boolean, default: true)

  Os campos já estão disponíveis nas rotas:
  - GET /lobster/setting - retorna configurações
  - PATCH /lobster/setting - atualiza configurações

  3. ✅ Lógica de Rollover Automático (Webhook)

  Quando um depósito é confirmado (prada-payment.gateway.ts):
  - Verifica configurações de rollover (user ou settings)
  - Cria RolloverRequirement para o depósito
  - Exemplo: depósito R$100 com multiplier 2x = rollover de R$200

  4. ✅ Bônus por Depósito Automático (Webhook)

  - Verifica eventos de promoção ativos
  - Encontra tier correspondente ao valor depositado
  - Credita bônus automaticamente no saldo
  - Cria RolloverRequirement separado para o bônus
  - Exemplo: deposita R$100, ganha R$50, precisa cumprir rollover adicional de R$100

  5. ✅ Nova Validação de Saque

  No users.service.ts:
  - Busca todos os rollovers ATIVOS do usuário
  - Se não houver, libera saque imediatamente
  - Se houver, valida volume total de apostas
  - Marca requisitos como COMPLETED em ordem FIFO
  - Mantém auditoria completa

  6. ✅ Novo Endpoint de Consulta

  GET /users/rollover-status retorna:
  {
    "has_rollover": true,
    "total_required": 300,
    "total_completed": 150,
    "remaining": 150,
    "requirements": [
      {
        "id": 1,
        "source_type": "deposit",
        "amount_required": 200,
        "amount_completed": 100,
        "remaining": 100,
        "created_at": "2026-01-13T..."
      },
      {
        "id": 2,
        "source_type": "deposit_bonus",
        "amount_required": 100,
        "amount_completed": 50,
        "remaining": 50,
        "created_at": "2026-01-13T..."
      }
    ]
  }

  📝 Próximos Passos:

  1. Aplicar a Migration:
  npx prisma migrate deploy
  # ou
  npx prisma migrate dev

  2. Gerar o Prisma Client:
  npx prisma generate

  3. Configurar Settings (via Lobster Admin):
  PATCH /lobster/setting
  {
    "default_rollover_active": true,
    "default_rollover_multiplier": 2,
    "new_user_roullete": true
  }

  4. Testar o Fluxo Completo:
  - Criar evento de promoção no admin
  - Simular webhook de depósito
  - Verificar rollover criado: SELECT * FROM rollover_requirements;
  - Testar consulta: GET /users/rollover-status
  - Simular apostas e testar saque

  🔍 Pontos Importantes:

  - Clean Slate: Apenas novos depósitos criam rollovers (usuários antigos sem requirement = sem rollover)
  - FIFO: Volume de apostas preenche requisitos do mais antigo para o mais recente
  - Múltiplos Rollovers: Todos os requisitos ATIVOS são somados na validação
  - Auditoria Completa: Cada rollover guarda snapshot do multiplier usado
  - Transparência: Usuários podem consultar exatamente quanto falta via API

  O sistema está pronto para uso! 🚀