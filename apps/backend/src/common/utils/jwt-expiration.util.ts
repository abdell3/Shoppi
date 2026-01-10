export function parseJwtExpiresIn(value: string | undefined): number {
  if (!value) {
    throw new Error('JWT_EXPIRES_IN is not defined');
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error('JWT_EXPIRES_IN must be a positive number (in seconds)');
  }

  return parsed;
}
