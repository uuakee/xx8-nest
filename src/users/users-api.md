# API de Usuários – Documentação de Endpoints

## Introdução

Este documento descreve a API pública de usuários exposta pelo módulo `Users`.
Ela é utilizada pelo frontend do site/app para:

- consultar saldos
- criar depósitos e solicitar saques
- consultar histórico de jogo
- visualizar e resgatar bônus VIP
- acompanhar progresso VIP
- visualizar e resgatar rakeback
- consultar estatísticas de afiliado
- consultar e resgatar cofres (chests)
- resgatar códigos promocionais

Convenções:

- Base URL: `https://SEU_DOMINIO/api/users`
- Todas as rotas exigem autenticação JWT:
  - Header: `Authorization: Bearer <token_jwt_do_usuário>`
- Respostas de erro seguem padrão NestJS:
  - `400 Bad Request` – validação de dados ou regras de negócio
  - `401 Unauthorized` – token ausente ou inválido
  - `404 Not Found` – recurso não encontrado (`user_not_found`, etc.)

Os exemplos abaixo usam JSON simplificado, focando nos campos importantes para o frontend.

---

## Autorização

Todas as rotas abaixo usam:

```http
Authorization: Bearer <jwt-token>
```

Em caso de ausência ou token inválido:

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Saldos

### GET `/users/getBalances`

Retorna os saldos do usuário logado.

- Método: `GET`
- Headers:
  - `Authorization: Bearer <token>`
- Parâmetros: nenhum

Exemplo de requisição:

```http
GET /users/getBalances HTTP/1.1
Authorization: Bearer <token>
```

Resposta de sucesso:

- `200 OK`

```json
{
  "id": 1,
  "pid": "12345678",
  "balance": 100.0,
  "affiliate_balance": 10.0,
  "vip_balance": 5.0
}
```

Erros:

- `404 Not Found` – `user_not_found`.

```json
{
  "statusCode": 404,
  "message": "user_not_found"
}
```

---

## Depósito

### POST `/users/deposit`

Cria um pedido de depósito via gateway Prada.

- Método: `POST`
- Headers: `Authorization`, `Content-Type: application/json`
- Body (`CreateDepositDto` simplificado):

```json
{
  "amount": 50.0
}
```

Exemplo:

```http
POST /users/deposit HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50.0
}
```

Resposta de sucesso (estrutura depende do gateway, via `PradaPaymentGatewayService.createDeposit`):

- `201 Created` ou `200 OK` (conforme implementação do gateway), exemplo simplificado:

```json
{
  "deposit_id": 123,
  "amount": 50.0,
  "status": "PENDING",
  "payment_url": "https://gateway.com/pay/..."
}
```

Erros:

- `400 Bad Request` – validação de `amount` (por exemplo, valor inválido).
- `401 Unauthorized`.

---

## Saque

### POST `/users/withdraw`

Cria uma requisição de saque (withdrawal).

- Método: `POST`
- Headers: `Authorization`, `Content-Type: application/json`
- Body (`CreateWithdrawalDto` simplificado):

```json
{
  "amount": 100.0,
  "user_name": "Nome Completo",
  "user_document": "00000000000",
  "keypix": "chave@pix.com",
  "keytype": "email"
}
```

Resposta de sucesso:

- `201 Created` ou `200 OK`:

```json
{
  "id": 10,
  "amount": 100.0,
  "status": "PENDING",
  "created_at": "2025-01-01T12:00:00.000Z"
}
```

Possíveis erros (`400 Bad Request`):

- `invalid_amount` – valor menor ou igual a zero.
- `user_not_allowed` – usuário inexistente, inativo ou banido.
- `settings_not_configured` – configurações de saque não encontradas.
- `amount_below_min_withdrawal` – abaixo do mínimo configurado.
- `amount_above_max_withdrawal` – acima do máximo configurado.
- `no_deposit_for_withdrawal` – usuário nunca depositou.
- `rollover_not_completed` – rollover não completado.
- `insufficient_balance` – saldo insuficiente.

Exemplo de erro:

```json
{
  "statusCode": 400,
  "message": "insufficient_balance"
}
```

---

## Histórico de Jogo

### GET `/users/game-history`

Retorna estatísticas de jogo para as últimas X horas.

- Método: `GET`
- Query:
  - `hours` (number) – permitido: `3`, `12`, `24`, `48`, `168`. Qualquer outro valor será ajustado para `3`.

Exemplo:

```http
GET /users/game-history?hours=24 HTTP/1.1
Authorization: Bearer <token>
```

Resposta de sucesso:

- `200 OK`:

```json
{
  "period_hours": 24,
  "total_bets_count": 50,
  "total_volume": 1000.0,
  "total_lost": 200.0,
  "games": [
    {
      "game_name": "Slot A",
      "game_image": "https://...",
      "total_bets_count": 30,
      "total_volume": 600.0
    }
  ]
}
```

Erros:

- `401 Unauthorized` – se não tiver token válido.

---

## Bônus VIP

### GET `/users/vip-bonuses`

Resumo dos bônus VIP do usuário.

Resposta:

```json
{
  "vip_balance": 5.0,
  "upgrade_total": 100.0,
  "weekly_total": 50.0,
  "monthly_total": 20.0,
  "upgrade_available": 40.0,
  "weekly_available": 10.0,
  "monthly_available": 5.0
}
```

Erros:

- `404 Not Found` – `user_not_found`.

### POST `/users/redeem-vip-bonus`

Resgata parte do saldo de bônus VIP para o saldo principal.

- Body (`RedeemVipBonusDto` simplificado):

```json
{
  "bonusType": "weekly",
  "amount": 10.0
}
```

Resposta de sucesso:

```json
{
  "bonus_type": "weekly",
  "redeemed_amount": 10.0,
  "balance": 110.0,
  "vip_balance": 0.0
}
```

Erros (`400 Bad Request`):

- `invalid_amount` – valor menor ou igual a zero.
- `vip_bonus_not_available` – nenhum bônus disponível para esse tipo.
- `insufficient_vip_bonus` – tentando resgatar mais que o disponível.

Erros (`404 Not Found`):

- `user_not_found`.

---

## Progresso VIP

### GET `/users/vip-progress`

Retorna o nível VIP atual e progresso para o próximo nível.

Resposta:

```json
{
  "vip": 1,
  "total_volume": 1000.0,
  "next_vip": 2,
  "next_vip_goal": 2000.0,
  "remaining_to_next": 1000.0
}
```

Erros:

- `404 Not Found` – `user_not_found`.

---

## Rakeback

### GET `/users/rakeback`

Resumo do rakeback.

Resposta:

```json
{
  "balance": 100.0,
  "total_granted": 50.0,
  "total_redeemed": 30.0,
  "total_pending": 20.0,
  "expected_next_rakeback": 2.5,
  "histories": [
    {
      "id": 1,
      "user_id": 1,
      "setting_id": 1,
      "amount": 10.0,
      "redeemed": false,
      "created_at": "2025-01-01T12:00:00.000Z",
      "setting": {
        "id": 1,
        "name": "Rakeback 10%"
      }
    }
  ]
}
```

Erros:

- `404 Not Found` – `user_not_found`.

### POST `/users/redeem-rakeback`

Resgata todo o rakeback pendente.

Resposta:

```json
{
  "redeemed_amount": 20.0,
  "balance": 120.0
}
```

Erros (`400 Bad Request`):

- `no_rakeback_available` – não há rakeback pendente.

Erros (`404 Not Found`):

- `user_not_found`.

---

## Estatísticas de Afiliado

### GET `/users/affiliate-stats`

Retorna estatísticas resumidas de afiliado.

- Query:
  - `from` (string ISO, opcional)
  - `to` (string ISO, opcional)

Se `from`/`to` não forem informados, é usado um período padrão (últimos 15 dias para comissão).

Exemplo:

```http
GET /users/affiliate-stats?from=2025-01-01&to=2025-01-31 HTTP/1.1
Authorization: Bearer <token>
```

Resposta:

```json
{
  "commission": {
    "today": { "direct": 10.0, "indirect": 5.0 },
    "yesterday": { "direct": 0.0, "indirect": 0.0 },
    "last_7_days": { "direct": 50.0, "indirect": 20.0 },
    "last_15_days": { "direct": 80.0, "indirect": 30.0 }
  },
  "registrations": {
    "direct_count": 10,
    "indirect_count": 20
  },
  "bets": {
    "direct_count": 100,
    "indirect_count": 200
  },
  "first_deposits": {
    "direct_count": 5,
    "indirect_count": 8,
    "direct_total_amount": 500.0,
    "indirect_total_amount": 800.0
  }
}
```

Erros:

- `404 Not Found` – `user_not_found`.

---

## Cofres (Chests)

### GET `/users/chests`

Resumo dos cofres e saques de cofres do usuário.

Resposta:

```json
{
  "total_invited_friends": 10,
  "total_qualified_friends": 4,
  "chests": [
    {
      "id": 1,
      "need_referral": 2,
      "need_deposit": 50.0,
      "need_bet": 100.0,
      "bonus": 10.0,
      "is_active": true,
      "qualified_friends": 4,
      "redeemed_count": 1,
      "available_to_redeem": 1
    }
  ],
  "withdrawals": [
    {
      "id": 1,
      "user_id": 1,
      "chest_id": 1,
      "amount": 10.0,
      "status": true,
      "created_at": "2025-01-01T12:00:00.000Z"
    }
  ]
}
```

Erros:

- `404 Not Found` – `user_not_found`.

### POST `/users/chests/:id/redeem`

Resgata um cofre específico.

- Parâmetro de rota:
  - `id` – id do chest

Resposta:

```json
{
  "id": 1,
  "chest_id": 1,
  "amount": 10.0,
  "status": true,
  "created_at": "2025-01-01T12:00:00.000Z"
}
```

Erros (`400 Bad Request`):

- `chest_not_available` – cofre inativo ou inexistente.
- `no_qualified_friends` – nenhum amigo qualificado.
- `invalid_chest_configuration` – chest configurado com `need_referral` inválido.
- `no_chest_available` – usuário já resgatou o máximo permitido.

Erros (`404 Not Found`):

- `user_not_found`.

---

## Resgate de Código Promocional

### POST `/users/redeem-code`

Resgata um código promocional (`ReedemCode`).

- Body:

```json
{
  "code": "PROMO2025"
}
```

Resposta de sucesso:

```json
{
  "id": 1,
  "reedem_code_id": 10,
  "user_id": 1,
  "collected_at": "2025-01-01T12:00:00.000Z"
}
```

Erros (`400 Bad Request`):

- `invalid_code` – string vazia ou inválida.
- `redeem_code_not_available` – código não existe ou inativo.
- `redeem_code_limit_reached` – limite global de coletas atingido.
- `redeem_code_already_used` – usuário já usou este código.

Erros (`404 Not Found`):

- `user_not_found`.

---

## Padrão de Erros Genéricos

Além das mensagens específicas citadas, a API pode retornar:

- `400 Bad Request` – validação de DTO:

```json
{
  "statusCode": 400,
  "message": ["amount must be a number"],
  "error": "Bad Request"
}
```

- `401 Unauthorized` – token ausente ou inválido:

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

- `404 Not Found` – por exemplo:

```json
{
  "statusCode": 404,
  "message": "user_not_found"
}
```

