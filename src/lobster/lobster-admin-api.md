# API Admin Lobster – Documentação de Endpoints

## Introdução

Este documento descreve a API administrativa exposta pelo módulo `Lobster` do backend NestJS.
Ela é utilizada principalmente pelo painel administrativo (frontend) para gerenciar:

- autenticação de administradores
- categorias, jogos e banners
- configurações gerais e provedores de jogo/pagamento
- mensagens, promoções e cofres (chests)
- usuários, depósitos, saques e códigos promocionais
- níveis VIP, rakeback
- promoções de depósito (eventos, tiers e participações)

Convenções:

- Base URL: `https://SEU_DOMINIO/api/lobster`
- Todas as rotas (exceto `/login`) exigem header de autenticação:
  - `Authorization: Bearer <token_admin_jwt>`
- Respostas de erro seguem padrão:
  - `400 Bad Request` – validação de dados ou regras de negócio
  - `401 Unauthorized` – token ausente ou inválido
  - `404 Not Found` – recurso não encontrado, com mensagem específica

Os exemplos abaixo usam JSON simplificado para focar apenas nos campos importantes para o frontend.

---

## Autenticação

### POST `/lobster/login`

- Método: `POST`
- Headers:
  - `Content-Type: application/json`
- Body:
  - `email` (string)
  - `password` (string)

Exemplo de requisição:

```http
POST /lobster/login HTTP/1.1
Content-Type: application/json

{
  "email": "admin@site.com",
  "password": "senha123"
}
```

Respostas:

- `200 OK`

```json
{
  "access_token": "jwt-token",
  "admin": {
    "id": 1,
    "name": "Admin",
    "email": "admin@site.com",
    "status": true
  }
}
```

- `401 Unauthorized`

```json
{
  "statusCode": 401,
  "message": "invalid_credentials"
}
```

---

## Categorias

### GET `/lobster/categories`

- Método: `GET`
- Headers: `Authorization`
- Parâmetros: nenhum

Exemplo:

```http
GET /lobster/categories HTTP/1.1
Authorization: Bearer <token>
```

Respostas:

- `200 OK`

```json
[
  {
    "id": 1,
    "name": "Slots",
    "image": "https://...",
    "is_active": true
  }
]
```

- `401 Unauthorized` – ausência ou token inválido.

### POST `/lobster/categories`

- Método: `POST`
- Body (CreateCategoryDto resumido):

```json
{
  "name": "Slots",
  "image": "https://..."
}
```

Respostas:

- `201 Created` – categoria criada.
- `400 Bad Request` – erro de validação.
- `401 Unauthorized`.

### GET `/lobster/categories/:id`

- Parâmetros de rota:
  - `id` (number)

Respostas:

- `200 OK` – categoria + lista de jogos.
- `404 Not Found` – `category_not_found`.

### PATCH `/lobster/categories/:id`

- Método: `PATCH`
- Body: campos parciais de categoria (ex.: `name`, `image`, `is_active`).

Respostas:

- `200 OK` – categoria atualizada.
- `404 Not Found` – `category_not_found`.

### POST `/lobster/categories/:id/games/:gameId`

Associa um jogo a uma categoria.

- Parâmetros de rota:
  - `id` – id da categoria
  - `gameId` – id do jogo

Respostas:

- `200 OK` – categoria com jogos atualizada.
- `404 Not Found` – `category_not_found` ou `game_not_found`.

### POST `/lobster/categories/:id/games`

Adiciona múltiplos jogos a uma categoria.

- Body (`AddGamesToCategoryDto` simplificado):

```json
{
  "game_ids": [1, 2, 3]
}
```

Respostas:

- `200 OK` – categoria com jogos atualizada.
- `404 Not Found` – `category_not_found` ou `game_not_found`.

---

## Jogos

### GET `/lobster/games`

Lista todos os jogos.

### POST `/lobster/games`

Cria um jogo.

### GET `/lobster/games/:id`

- `404 Not Found` – `game_not_found`.

### PATCH `/lobster/games/:id`

Atualiza dados de um jogo.

- `404 Not Found` – `game_not_found`.

### POST `/lobster/games/:id/categories`

Define o conjunto de categorias de um jogo.

Body:

```json
{
  "category_ids": [1, 2]
}
```

---

## Configuração de Pagamento – Prada

### GET `/lobster/prada-payment`

Retorna configuração atual da integração Prada.

- `404 Not Found` – `prada_payment_not_found`.

### PATCH `/lobster/prada-payment`

Atualiza configuração.

Body (UpdatePradaPaymentDto simplificado):

```json
{
  "base_url": "https://api.pradapay.com",
  "api_key": "****",
  "active": true
}
```

---

## Banners

### GET `/lobster/banners`
### POST `/lobster/banners`
### GET `/lobster/banners/:id`
### PATCH `/lobster/banners/:id`
### DELETE `/lobster/banners/:id`

Erros principais:

- `404 Not Found` – `banner_not_found` (get/patch/delete).

Estrutura simplificada:

```json
{
  "id": 1,
  "name": "Banner Home",
  "image_url": "https://...",
  "target_url": "https://...",
  "is_active": true,
  "sort_order": 0
}
```

DELETE:

```json
{ "deleted": true }
```

---

## Sub-banners, Popup Banners e Popup Icons

Padrão idêntico a `banners`, com mensagens:

- `sub_banner_not_found`
- `popup_banner_not_found`
- `popup_icon_not_found`

Endpoints:

- `/lobster/sub-banners` (GET, POST)
- `/lobster/sub-banners/:id` (GET, PATCH, DELETE)
- `/lobster/popup-banners` (GET, POST)
- `/lobster/popup-banners/:id` (GET, PATCH, DELETE)
- `/lobster/popup-icons` (GET, POST)
- `/lobster/popup-icons/:id` (GET, PATCH, DELETE)

---

## Configuração Geral (Setting)

### GET `/lobster/setting`

- `404 Not Found` – `setting_not_found`.

### PATCH `/lobster/setting`

Atualiza campos da configuração (nome do site, limites, etc.).

---

## Provedores de Jogo

### GET `/lobster/game-providers`

Retorna configuração de:

- Pragmatic clone (`pp_clone`)
- PG clone (`pg_clone`)
- Poker (`poker`)

### PATCH `/lobster/game-providers/pp-clone`
### PATCH `/lobster/game-providers/pg-clone`
### PATCH `/lobster/game-providers/poker`

Atualizam configurações específicas de cada provedor.

---

## Mensagens (Mensage)

### GET `/lobster/messages`
### POST `/lobster/messages`
### PATCH `/lobster/messages/:id`

Erros:

- `404 Not Found` – `message_not_found` (update).

Estrutura:

```json
{
  "id": 1,
  "title": "Aviso",
  "content": "Texto da mensagem",
  "is_active": true
}
```

---

## Promoções (Promotions)

### GET `/lobster/promotions`
### GET `/lobster/promotions/:id`
### POST `/lobster/promotions`
### PATCH `/lobster/promotions/:id`
### DELETE `/lobster/promotions/:id`

Erros:

- `404 Not Found` – `promotion_not_found`.

Estrutura simplificada:

```json
{
  "id": 1,
  "name": "Promoção VIP",
  "icon_url": "https://...",
  "image_url": "https://...",
  "target_url": "https://...",
  "is_active": true,
  "sort_order": 0,
  "starts_at": "2025-01-01T00:00:00.000Z",
  "ends_at": "2025-01-31T23:59:59.000Z"
}
```

---

## Chests (Cofres)

### GET `/lobster/chests`
### POST `/lobster/chests`
### PATCH `/lobster/chests/:id`
### DELETE `/lobster/chests/:id`

Erros:

- `404 Not Found` – `chest_not_found` (update/delete).

DELETE não remove o registro, apenas desativa:

```json
{ "deleted": true }
```

---

## Usuários (Admin)

### GET `/lobster/users`

Lista usuários com filtros (AdminListUsersDto).

Query params principais:

- `page`, `page_size`
- `pid`, `phone`, `document`
- `status`, `banned`
- `search`

Resposta:

```json
{
  "items": [
    {
      "id": 1,
      "pid": "12345678",
      "phone": "5511999999999",
      "document": "00000000000",
      "status": true,
      "banned": false,
      "vip": 0
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 10,
    "total_pages": 1
  }
}
```

### GET `/lobster/users/:id`

- `404 Not Found` – `user_not_found`.

### POST `/lobster/users`

Cria usuário manualmente (AdminCreateUserDto).

Erros:

- `400 Bad Request` – `phone_in_use`, `document_in_use`.

### PATCH `/lobster/users/:id`

Atualiza dados e limites do usuário.

- `404 Not Found` – `user_not_found`.

### DELETE `/lobster/users/:id`

Soft-delete / banimento:

```json
{ "deleted": true }
```

Erros:

- `404 Not Found` – `user_not_found`.

---

## Depósitos, Saques e Saques de Chest

### GET `/lobster/deposits`

Lista depósitos com filtros (AdminListDepositsDto):

- `status`
- `created_from`, `created_to`
- `search` (por `reference`/`request_number`)
- filtros de usuário (`user_pid`, `user_phone`, `user_document`)

Resposta paginada:

```json
{
  "items": [
    {
      "id": 1,
      "user_id": 1,
      "amount": 50.0,
      "status": "PAID",
      "reference": "PRADA-123",
      "created_at": "2025-01-01T12:00:00.000Z",
      "user": {
        "id": 1,
        "pid": "12345678",
        "phone": "5511999999999",
        "document": "00000000000"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

### GET `/lobster/withdrawals`

Mesma estrutura para saques, com filtros em `AdminListWithdrawalsDto`.

### GET `/lobster/chest-withdrawals`

Lista saques de cofres, com filtros específicos de chest.

---

## Códigos Promocionais (Redeem Codes)

### GET `/lobster/redeem-codes`
### GET `/lobster/redeem-codes/:id`
### POST `/lobster/redeem-codes`
### PATCH `/lobster/redeem-codes/:id`
### DELETE `/lobster/redeem-codes/:id`

Erros:

- `404 Not Found` – `redeem_code_not_found`.

DELETE desativa o código:

```json
{ "deleted": true }
```

### GET `/lobster/redeem-code-histories`

Lista histórico de resgates com filtros (AdminListReedemCodeHistoriesDto) e resposta paginada (`items` + `pagination`).

---

## VIP – Histórico e Níveis

### GET `/lobster/vip-histories`

Lista histórico VIP com filtros (AdminListVipHistoriesDto).

### GET `/lobster/vip-levels`
### GET `/lobster/vip-levels/:id`
### POST `/lobster/vip-levels`
### PATCH `/lobster/vip-levels/:id`
### DELETE `/lobster/vip-levels/:id`

Erros:

- `404 Not Found` – `vip_level_not_found`.

### POST `/lobster/vip-bonuses/weekly`
### POST `/lobster/vip-bonuses/monthly`

Disparam manualmente os jobs de bônus semanal e mensal.

Resposta:

```json
{
  "processed_users": 10,
  "created_histories": 8
}
```

---

## Rakeback

### GET `/lobster/rakeback-settings`
### GET `/lobster/rakeback-settings/:id`
### POST `/lobster/rakeback-settings`
### PATCH `/lobster/rakeback-settings/:id`
### DELETE `/lobster/rakeback-settings/:id`

Erros:

- `404 Not Found` – `rakeback_setting_not_found`.

### GET `/lobster/rakeback-histories`

Lista histórico de rakeback com filtros (AdminListRakebackHistoriesDto).

---

## Promoção de Depósito – Eventos, Tiers e Participações

### Eventos de Promoção

#### GET `/lobster/deposit-promo-events`

Lista todos os eventos com seus tiers.

Resposta:

```json
[
  {
    "id": 1,
    "name": "Grande Retorno de Depósito",
    "start_date": "2025-01-10T00:00:00.000Z",
    "end_date": "2025-01-10T23:59:59.000Z",
    "is_active": true,
    "tiers": [
      {
        "id": 1,
        "event_id": 1,
        "name": "Depósito 50 ganha 5",
        "deposit_amount": 50.0,
        "bonus_amount": 5.0,
        "rollover_amount": 250.0,
        "is_active": true,
        "sort_order": 0
      }
    ]
  }
]
```

#### GET `/lobster/deposit-promo-events/:id`

- `404 Not Found` – `deposit_promo_event_not_found`.

#### POST `/lobster/deposit-promo-events`

Body:

```json
{
  "name": "Grande Retorno de Depósito",
  "start_date": "2025-01-10T00:00:00.000Z",
  "end_date": "2025-01-10T23:59:59.000Z",
  "is_active": true
}
```

#### PATCH `/lobster/deposit-promo-events/:id`
#### DELETE `/lobster/deposit-promo-events/:id`

- `404 Not Found` – `deposit_promo_event_not_found`.

DELETE:

```json
{ "deleted": true }
```

### Tiers de Promoção

#### GET `/lobster/deposit-promo-tiers`

Query opcional:

- `event_id` (number) – filtra tiers por evento.

#### GET `/lobster/deposit-promo-tiers/:id`

- `404 Not Found` – `deposit_promo_tier_not_found`.

#### POST `/lobster/deposit-promo-tiers`

Body:

```json
{
  "event_id": 1,
  "name": "Depósito 50 ganha 5",
  "deposit_amount": 50.0,
  "bonus_amount": 5.0,
  "rollover_amount": 250.0,
  "is_active": true,
  "sort_order": 0
}
```

Erros:

- `404 Not Found` – `deposit_promo_event_not_found` se `event_id` não existir.

#### PATCH `/lobster/deposit-promo-tiers/:id`
#### DELETE `/lobster/deposit-promo-tiers/:id`

Erros:

- `404 Not Found` – `deposit_promo_tier_not_found`.

DELETE:

```json
{ "deleted": true }
```

### Auditoria de Participações

#### GET `/lobster/deposit-promo-participations`

Lista participações dos usuários em tiers de promoção de depósito.

Query params (AdminListDepositPromoParticipationsDto):

- `event_id` (number)
- `tier_id` (number)
- `user_pid` (string)
- `user_phone` (string)
- `user_document` (string)
- `promo_date_from` (ISO string)
- `promo_date_to` (ISO string)
- `page`, `page_size`
- `order_by` (`promo_date` | `id`)
- `order_dir` (`asc` | `desc`)

Resposta:

```json
{
  "items": [
    {
      "id": 1,
      "user_id": 1,
      "tier_id": 1,
      "deposit_id": 10,
      "promo_date": "2025-01-10T12:00:00.000Z",
      "user": {
        "id": 1,
        "pid": "12345678",
        "phone": "5511999999999",
        "document": "00000000000"
      },
      "tier": {
        "id": 1,
        "name": "Depósito 50 ganha 5",
        "event": {
          "id": 1,
          "name": "Grande Retorno de Depósito"
        }
      },
      "deposit": {
        "id": 10,
        "amount": 50.0,
        "status": "PAID",
        "reference": "PRADA-123"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

Erros:

- `401 Unauthorized` – sem token admin.
- `400 Bad Request` – parâmetros inválidos (ex.: `page` negativo).

---

## Padrão de Erros Genéricos

Além das mensagens específicas citadas, a API pode retornar:

- `400 Bad Request` – validação de DTO (`class-validator`):

```json
{
  "statusCode": 400,
  "message": ["name should not be empty"],
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

- `404 Not Found` – mensagens específicas de recurso:
  - `user_not_found`
  - `category_not_found`
  - `game_not_found`
  - `banner_not_found`
  - `sub_banner_not_found`
  - `popup_banner_not_found`
  - `popup_icon_not_found`
  - `setting_not_found`
  - `prada_payment_not_found`
  - `message_not_found`
  - `promotion_not_found`
  - `vip_level_not_found`
  - `chest_not_found`
  - `redeem_code_not_found`
  - `rakeback_setting_not_found`
  - `deposit_promo_event_not_found`
  - `deposit_promo_tier_not_found`

Formato:

```json
{
  "statusCode": 404,
  "message": "resource_not_found"
}
```

Substituindo `resource_not_found` por uma das mensagens acima.

