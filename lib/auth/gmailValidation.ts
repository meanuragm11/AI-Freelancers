export function validateStrictGmail(email: string): string | null {
  const lowerEmail = email.toLowerCase().trim();
  if (!lowerEmail.endsWith('@gmail.com')) {
    return 'Security Policy: Only @gmail.com addresses are permitted.';
  }
  if (lowerEmail.includes('+')) {
    return 'Security Policy: Gmail alias addresses (+) are strictly prohibited.';
  }
  const localPart = lowerEmail.split('@')[0];
  if ((localPart.match(/\./g) || []).length > 2) {
    return 'Security Policy: Suspicious email format detected.';
  }
  return null;
}
