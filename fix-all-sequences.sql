-- Script para corrigir todas as sequências de autoincrement no banco de dados
-- Execute este script quando tiver erros de "Unique constraint failed on id"

-- Corrige sequência da tabela users
SELECT setval(
  pg_get_serial_sequence('users', 'id'),
  COALESCE((SELECT MAX(id) FROM users), 0) + 1,
  false
);

-- Corrige sequência da tabela deposits
SELECT setval(
  pg_get_serial_sequence('deposits', 'id'),
  COALESCE((SELECT MAX(id) FROM deposits), 0) + 1,
  false
);

-- Corrige sequência da tabela withdrawals
SELECT setval(
  pg_get_serial_sequence('withdrawals', 'id'),
  COALESCE((SELECT MAX(id) FROM withdrawals), 0) + 1,
  false
);

-- Corrige sequência da tabela game_transactions
SELECT setval(
  pg_get_serial_sequence('game_transactions', 'id'),
  COALESCE((SELECT MAX(id) FROM game_transactions), 0) + 1,
  false
);

-- Corrige sequência da tabela affiliate_histories
SELECT setval(
  pg_get_serial_sequence('affiliate_histories', 'id'),
  COALESCE((SELECT MAX(id) FROM affiliate_histories), 0) + 1,
  false
);

-- Corrige sequência da tabela rollover_requirements
SELECT setval(
  pg_get_serial_sequence('rollover_requirements', 'id'),
  COALESCE((SELECT MAX(id) FROM rollover_requirements), 0) + 1,
  false
);

-- Corrige sequência da tabela vip_histories
SELECT setval(
  pg_get_serial_sequence('vip_histories', 'id'),
  COALESCE((SELECT MAX(id) FROM vip_histories), 0) + 1,
  false
);

-- Corrige sequência da tabela rakeback_histories
SELECT setval(
  pg_get_serial_sequence('rakeback_histories', 'id'),
  COALESCE((SELECT MAX(id) FROM rakeback_histories), 0) + 1,
  false
);

-- Adicione outras tabelas conforme necessário

-- Mensagem de sucesso
SELECT 'Todas as sequências foram corrigidas com sucesso!' as resultado;
