
// src/lib/auth.ts
// timingSafeEqual removed

const enc = new TextEncoder();

function b64(u8: Uint8Array) {
    return btoa(String.fromCharCode(...u8));
}

function unb64(s: string) {
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 100_000;
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
        keyMaterial,
        256
    );
    const dk = new Uint8Array(bits);
    return `pbkdf2_sha256$${iterations}$${b64(salt)}$${b64(dk)}`;
}

export async function verifyPassword(
    password: string,
    stored: string
): Promise<boolean> {
    const [alg, iterStr, saltB64, dkB64] = stored.split('$');
    if (alg !== 'pbkdf2_sha256') return false;
    const iterations = Number(iterStr);
    const salt = unb64(saltB64);
    const expected = unb64(dkB64);
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
        keyMaterial,
        expected.length * 8
    );
    const actual = new Uint8Array(bits);

    // Timing-safe comparison if possible, or simple check for now
    // Note: crypto.subtle timing attacks are a risk, but this is MVP standard.
    if (actual.length !== expected.length) return false;

    let match = true;
    for (let i = 0; i < actual.length; i++) {
        if (actual[i] !== expected[i]) match = false;
    }
    return match;
}
