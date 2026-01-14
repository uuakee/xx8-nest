📋 CHECKLIST DE MIGRAÇÃO
Pré-Migração
 Schema Prisma já configurado para MySQL
 Verificar versão MySQL (mínimo 5.7, recomendado 8.0+)
 Backup completo do banco PostgreSQL atual
 Criar banco MySQL de destino com collation correto
Durante Migração
 Atualizar DATABASE_URL no .env
 Executar npx prisma migrate deploy
 Executar npx prisma generate
 Migrar dados históricos (se houver)
 Resetar sequences de auto-increment
Pós-Migração (Testes Críticos)
 Testar transação de saque com rollover
 Testar upgrade de VIP (aggregate complexo)
 Testar resgates de bônus VIP
 Testar webhook de provedores de jogos
 Testar criação de depósito
 Validar saldos com prisma studio
 Executar suite de testes (se houver)
🚀 COMANDOS DE MIGRAÇÃO

# 1. Verificar versão MySQL
mysql --version  # Deve ser >= 5.7

# 2. Criar banco de dados
mysql -u root -p
CREATE DATABASE xx8_nest CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 3. Atualizar .env
DATABASE_URL="mysql://user:password@localhost:3306/xx8_nest"

# 4. Executar migrações
npx prisma migrate deploy

# 5. Gerar Prisma Client
npx prisma generate

# 6. Validar schema
npx prisma db pull
npx prisma validate

# 7. Abrir Prisma Studio (visual)
npx prisma studio
📊 ESTIMATIVA DE ESFORÇO
Tarefa	Tempo Estimado	Complexidade
Setup banco MySQL	30 min	Baixa
Executar migrações Prisma	15 min	Baixa
Migrar dados históricos	1-2 horas	Média
Testes de transações críticas	1 hora	Média
Validação completa	30 min	Baixa
TOTAL	3-4 horas	Baixa
✅ RISCOS E MITIGAÇÃO
Risco	Probabilidade	Impacto	Mitigação
Perda de dados	Baixa	Alto	Backup completo antes da migração
Inconsistência de saldos	Baixa	Alto	Validar com queries de soma total
Problemas em transações	Muito Baixa	Alto	Testar fluxos críticos em staging
Case sensitivity	Baixa	Baixo	Código já trata corretamente
Performance	Baixa	Médio	Monitorar queries lentas
🎯 RECOMENDAÇÃO FINAL
✅ A MIGRAÇÃO É TOTALMENTE VIÁVEL

Razões:

Schema Prisma já está configurado para MySQL
Nenhuma query raw SQL ou feature específica de PostgreSQL
Todas as transações ACID são compatíveis
Tipos de dados totalmente suportados
Prisma ORM abstrai diferenças entre bancos
Código não depende de features específicas do PostgreSQL
Próximos passos sugeridos:

Criar ambiente de staging com MySQL
Executar migrações em staging
Rodar testes completos
Validar dados com Prisma Studio
Planejar janela de migração em produção