import * as bycrypt from 'bcrypt';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUND);
if(!SALT_ROUNDS || Number.isNaN(SALT_ROUNDS)) {
    throw new Error('BCRYPT_SALT_ROUND must be a valid number');
}

export async function hashPassword(plainPassword: string): Promise<string> {
    return bycrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bycrypt.compare(plainPassword, hashedPassword);
} 