# Troubleshooting - Problemas Comuns

## Erro: "Unique constraint failed on the fields: (`id`)" ao criar usuário

### Sintoma
Ao tentar registrar um novo usuário, o sistema retorna o erro:
```
PrismaClientKnownRequestError: Unique constraint failed on the fields: (`id`)
code: 'P2002'
```

### Causa
A sequência de autoincrement do PostgreSQL está dessincronizada. Isso pode acontecer quando:
- Dados foram inseridos manualmente no banco com IDs específicos
- Uma migração foi executada incorretamente
- O banco foi restaurado de um backup sem ajustar as sequências
- Dados foram copiados de outro banco

### Solução Rápida

#### Opção 1: Corrigir apenas a tabela users
```bash
PGPASSWORD="sua_senha" psql -h host -p porta -U usuario -d database -f fix-user-sequence.sql
```

#### Opção 2: Corrigir todas as sequências
```bash
PGPASSWORD="sua_senha" psql -h host -p porta -U usuario -d database -f fix-all-sequences.sql
```

#### Opção 3: Comando direto
```bash
PGPASSWORD="sua_senha" psql -h host -p porta -U usuario -d database -c \
  "SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 0) + 1, false);"
```

### Prevenção
Para evitar esse problema no futuro:
1. Nunca insira dados manualmente com IDs específicos
2. Use sempre `INSERT` sem especificar o campo `id`
3. Após restaurar backups, execute o script `fix-all-sequences.sql`
4. Após copiar dados entre bancos, execute o script `fix-all-sequences.sql`

### Verificar se o problema foi resolvido
Após executar o script, tente registrar um novo usuário. O erro não deve mais aparecer.

---

## Outros Problemas Comuns

### Erro de conexão com banco de dados
Verifique se:
1. O banco PostgreSQL está rodando
2. As credenciais no arquivo `.env` estão corretas
3. O firewall permite conexão na porta especificada

### Erro em migrations
Se uma migration falhar:
```bash
# Reverter última migration
npx prisma migrate resolve --rolled-back nome_da_migration

# Aplicar novamente
npx prisma migrate deploy
```

### Regenerar Prisma Client
Se houver problemas com tipos TypeScript:
```bash
npx prisma generate
```
