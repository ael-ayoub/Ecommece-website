import argon2 from "argon2";

/** Used for admin/customer passwords AND OTP/reset codes — argon2id everywhere, never plaintext. */
export async function hashSecret(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifySecret(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
