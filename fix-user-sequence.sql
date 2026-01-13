-- Corrige a sequência do autoincrement da tabela users
-- Este script ajusta o próximo valor da sequência para ser maior que o maior ID existente

SELECT setval(
  pg_get_serial_sequence('users', 'id'),
  COALESCE((SELECT MAX(id) FROM users), 0) + 1,
  false
);
