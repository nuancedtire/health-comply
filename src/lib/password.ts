/**
 * PBKDF2 Password Hasher for Cloudflare Workers
 *
 * Uses the Web Crypto API (PBKDF2 with SHA-256) instead of scrypt/bcrypt
 * to stay within Cloudflare Workers' CPU time limits.
 *
 * Default scrypt takes ~80ms CPU time, exceeding the free tier's 10ms limit.
 * PBKDF2 with 60,000 iterations uses ~5-10ms, staying within limits.
 */

const ALGORITHM_ID = 'PBKDF2-SHA256';
const DEFAULT_ITERATIONS = 60000; // Tuned for Cloudflare Workers (20k-80k range)
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Generate cryptographically secure random salt
 */
function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Derive key using PBKDF2
 */
async function deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number
): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import the password as a key
    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Derive bits using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256'
        },
        baseKey,
        KEY_LENGTH * 8 // bits
    );

    return derivedBits;
}

/**
 * Hash a password using PBKDF2
 * Output format: ALGORITHM$ITERATIONS$SALT$HASH
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = generateSalt();
    const derivedKey = await deriveKey(password, salt, DEFAULT_ITERATIONS);

    const saltHex = bufferToHex(salt);
    const hashHex = bufferToHex(derivedKey);

    return `${ALGORITHM_ID}$${DEFAULT_ITERATIONS}$${saltHex}$${hashHex}`;
}

/**
 * Verify a password against a hash
 * Supports both new PBKDF2 format and legacy scrypt hashes
 */
export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
    const { hash, password } = data;

    // Check if this is our PBKDF2 format
    if (hash.startsWith(ALGORITHM_ID + '$')) {
        const parts = hash.split('$');
        if (parts.length !== 4) {
            return false;
        }

        const [, iterationsStr, saltHex, storedHashHex] = parts;
        const iterations = parseInt(iterationsStr, 10);
        const salt = hexToBuffer(saltHex);

        const derivedKey = await deriveKey(password, salt, iterations);
        const computedHashHex = bufferToHex(derivedKey);

        // Constant-time comparison to prevent timing attacks
        return timingSafeEqual(storedHashHex, computedHashHex);
    }

    // Legacy scrypt hash format from better-auth (base64 encoded)
    // Format: salt:hash (both base64 encoded)
    // We need to support verifying these for existing users, but new hashes use PBKDF2
    try {
        // Import the scrypt verification from better-auth for legacy hashes
        const { verifyPassword: verifyScrypt } = await import('better-auth/crypto');
        return await verifyScrypt({ hash, password });
    } catch {
        // If scrypt verification fails or is unavailable, return false
        return false;
    }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}
