
// src/lib/cookie.ts

export function parseCookies(cookieHeader: string | null): Record<string, string> {
    const list: Record<string, string> = {};
    if (!cookieHeader) return list;

    cookieHeader.split(';').forEach(function (cookie) {
        let [name, ...rest] = cookie.split('=');
        name = name?.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        if (!value) return;
        list[name] = decodeURIComponent(value);
    });

    return list;
}

export function serializeCookie(name: string, value: string, options: {
    maxAge: number; // seconds
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Lax' | 'Strict' | 'None';
} = { maxAge: 0 }): string {
    let str = `${name}=${encodeURIComponent(value)}`;

    if (options.maxAge) {
        str += `; Max-Age=${Math.floor(options.maxAge)}`;
    }
    if (options.path) {
        str += `; Path=${options.path}`;
    }
    if (options.httpOnly) {
        str += '; HttpOnly';
    }
    if (options.secure) {
        str += '; Secure';
    }
    if (options.sameSite) {
        str += `; SameSite=${options.sameSite}`;
    }

    return str;
}
