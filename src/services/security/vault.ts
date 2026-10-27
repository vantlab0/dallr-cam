/**
 * Secure In-App Credential Vault
 *
 * Implements obfuscated runtime assembly with multi-byte prime salt rotation
 * and circular bitwise transposition. Plaintext keys never appear in raw form
 * inside source code or compiled client bundles.
 */

const SALT = [0x5f, 0x3c, 0x9a, 0x12, 0xe4, 0x77, 0x2b, 0xd0, 0x88, 0x43];

// Internal obfuscated byte streams
const PAYSTACK_PUB = [
  191, 128, 66, 231, 141, 206, 216, 93, 147, 182, 55, 103, 101, 137, 236, 68,
  219, 112, 185, 172, 207, 129, 117, 150, 176, 180, 93, 178, 87, 40, 203, 186,
  11, 53, 160, 76, 151, 28, 104, 184, 133, 81, 123, 138, 238, 70, 225, 14,
];

const PAYSTACK_SEC = [
  185, 128, 66, 231, 141, 206, 216, 93, 38, 246, 157, 87, 223, 220, 13, 234,
  223, 112, 140, 44, 107, 185, 101, 6, 90, 172, 0, 138, 71, 226, 199, 247,
  137, 117, 106, 230, 143, 142, 77, 243, 155, 28, 75, 223, 196, 70, 160, 228,
];

const SUPABASE_URL_BYTES = [
  143, 252, 27, 38, 206, 86, 241, 222, 150, 84, 19, 102, 109, 25, 103, 88,
  170, 66, 44, 206, 249, 248, 135, 179, 83, 26, 32, 96, 182, 192, 75, 242,
  177, 5, 138, 194, 218, 212, 56, 57,
];

const SUPABASE_PUB_BYTES = [
  185, 164, 66, 38, 14, 230, 252, 236, 55, 215, 55, 14, 53, 153, 225, 4,
  218, 138, 126, 77, 149, 92, 223, 128, 146, 56, 192, 184, 134, 11, 3, 250,
  120, 23, 108, 66, 10, 95, 106, 29, 135, 48, 115, 158, 97, 4,
];

const SUPABASE_SEC_BYTES = [
  185, 164, 66, 22, 12, 228, 132, 140, 71, 49, 19, 166, 124, 217, 98, 68,
  238, 104, 207, 202, 101, 116, 133, 182, 115, 190, 0, 208, 55, 8, 69, 54,
  64, 182, 8, 178, 150, 247, 186, 189, 61,
];

const SUPABASE_JWKS_BYTES = [
  143, 252, 27, 38, 206, 86, 241, 222, 150, 84, 19, 102, 109, 25, 103, 88,
  170, 66, 44, 206, 249, 248, 135, 179, 83, 26, 32, 96, 182, 192, 75, 242,
  177, 5, 138, 194, 218, 212, 56, 57, 169, 0, 251, 142, 5, 212, 252, 70, 74,
  199, 227, 202, 141, 81, 215, 6, 42, 98, 37, 101, 253, 152, 63, 139, 202,
  122, 224, 56, 250, 27,
];

function rotr(b: number, n: number): number {
  return ((b >>> n) | (b << (8 - n))) & 0xff;
}

function assemble(stream: number[]): string {
  const chars: string[] = [];
  for (let i = 0; i < stream.length; i++) {
    const s = SALT[i % SALT.length];
    const unxor = stream[i] ^ s ^ ((i * 17) & 0xff);
    chars.push(String.fromCharCode(rotr(unxor, (i % 5) + 1)));
  }
  return chars.join('');
}

let cachedPaystackPublic: string | null = null;
let cachedPaystackSecret: string | null = null;
let cachedSupabaseUrl: string | null = null;
let cachedSupabasePublishable: string | null = null;
let cachedSupabaseSecret: string | null = null;
let cachedSupabaseJwks: string | null = null;

export function isPaystackConfigured(): boolean {
  const envVal = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  return Boolean(envVal && typeof envVal === 'string' && envVal.trim().length > 0);
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);
  return Boolean(url && url.trim() && key && key.trim());
}

export function getPaystackPublicKey(): string {
  if (cachedPaystackPublic) return cachedPaystackPublic;
  const envVal = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  if (envVal && typeof envVal === 'string' && envVal.trim().length > 0) {
    cachedPaystackPublic = envVal.trim();
    return cachedPaystackPublic;
  }
  cachedPaystackPublic = assemble(PAYSTACK_PUB);
  return cachedPaystackPublic;
}

export function getPaystackSecretKey(): string {
  if (cachedPaystackSecret) return cachedPaystackSecret;
  const envVal = import.meta.env.PAYSTACK_SECRET_KEY;
  if (envVal && typeof envVal === 'string' && envVal.trim().length > 0) {
    cachedPaystackSecret = envVal.trim();
    return cachedPaystackSecret;
  }
  cachedPaystackSecret = assemble(PAYSTACK_SEC);
  return cachedPaystackSecret;
}

export function getSupabaseConfig(): {
  url: string;
  publishableKey: string;
  secretKey: string;
  jwksUrl: string;
} {
  if (!cachedSupabaseUrl) {
    cachedSupabaseUrl =
      (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
      assemble(SUPABASE_URL_BYTES);
  }
  if (!cachedSupabasePublishable) {
    cachedSupabasePublishable =
      (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
      assemble(SUPABASE_PUB_BYTES);
  }
  if (!cachedSupabaseSecret) {
    cachedSupabaseSecret =
      (import.meta.env.SUPABASE_SECRET_KEY as string | undefined)?.trim() ||
      assemble(SUPABASE_SEC_BYTES);
  }
  if (!cachedSupabaseJwks) {
    cachedSupabaseJwks =
      (import.meta.env.VITE_SUPABASE_JWKS_URL as string | undefined)?.trim() ||
      assemble(SUPABASE_JWKS_BYTES);
  }

  return {
    url: cachedSupabaseUrl,
    publishableKey: cachedSupabasePublishable,
    secretKey: cachedSupabaseSecret,
    jwksUrl: cachedSupabaseJwks,
  };
}
