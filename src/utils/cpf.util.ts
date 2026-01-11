/**
 * Gera um CPF válido (apenas números) com dígitos verificadores corretos
 */
export function generateValidCPF(): string {
  // Gera 9 dígitos aleatórios
  const randomDigits: number[] = [];
  for (let i = 0; i < 9; i++) {
    randomDigits.push(Math.floor(Math.random() * 10));
  }

  // Calcula o primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += randomDigits[i] * (10 - i);
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  randomDigits.push(digit1);

  // Calcula o segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += randomDigits[i] * (11 - i);
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  randomDigits.push(digit2);

  // Retorna CPF como string de 11 dígitos
  return randomDigits.join('');
}

/**
 * Valida se um CPF é válido
 */
export function isValidCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, '');

  // Deve ter exatamente 11 dígitos
  if (cleaned.length !== 11) {
    return false;
  }

  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }

  const digits = cleaned.split('').map(Number);

  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  let remainder = sum % 11;
  const expectedDigit1 = remainder < 2 ? 0 : 11 - remainder;

  if (digits[9] !== expectedDigit1) {
    return false;
  }

  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i);
  }
  remainder = sum % 11;
  const expectedDigit2 = remainder < 2 ? 0 : 11 - remainder;

  if (digits[10] !== expectedDigit2) {
    return false;
  }

  return true;
}
