/**
 * Server-side file validation using magic bytes
 * Prevents file type spoofing attacks
 */

// Magic byte signatures for common file types
const MAGIC_BYTES: Record<string, { signature: number[]; offset?: number }[]> = {
    // PDF
    "application/pdf": [{ signature: [0x25, 0x50, 0x44, 0x46] }], // %PDF

    // Images
    "image/jpeg": [{ signature: [0xff, 0xd8, 0xff] }],
    "image/png": [{ signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
    "image/gif": [
        { signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
        { signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
    ],
    "image/webp": [{ signature: [0x52, 0x49, 0x46, 0x46], offset: 0 }], // RIFF (+ WEBP at offset 8)
    "image/bmp": [{ signature: [0x42, 0x4d] }], // BM
    "image/tiff": [
        { signature: [0x49, 0x49, 0x2a, 0x00] }, // Little endian
        { signature: [0x4d, 0x4d, 0x00, 0x2a] }, // Big endian
    ],

    // Microsoft Office (OOXML)
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        { signature: [0x50, 0x4b, 0x03, 0x04] }, // PK (ZIP)
    ],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        { signature: [0x50, 0x4b, 0x03, 0x04] }, // PK (ZIP)
    ],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
        { signature: [0x50, 0x4b, 0x03, 0x04] }, // PK (ZIP)
    ],

    // Legacy Microsoft Office (OLE)
    "application/msword": [{ signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],
    "application/vnd.ms-excel": [{ signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],

    // Text files (no magic bytes, but we can check for valid UTF-8)
    "text/plain": [], // Special handling
    "text/csv": [], // Special handling
};

// Allowed MIME types for evidence upload
export const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.ms-excel",
    "text/plain",
    "text/csv",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Validate file type by checking magic bytes
 * Returns the detected MIME type or null if invalid
 */
export async function validateFileType(
    file: File | ArrayBuffer,
    claimedMimeType: string
): Promise<{ valid: boolean; detectedType: string | null; reason?: string }> {
    try {
        // Get first 16 bytes for magic number detection
        let buffer: ArrayBuffer;
        if (file instanceof File) {
            const slice = file.slice(0, 16);
            buffer = await slice.arrayBuffer();
        } else {
            buffer = file.slice(0, 16);
        }

        const bytes = new Uint8Array(buffer);

        // Check if claimed type is allowed
        if (!ALLOWED_MIME_TYPES.includes(claimedMimeType as AllowedMimeType)) {
            return {
                valid: false,
                detectedType: null,
                reason: `File type "${claimedMimeType}" is not allowed`,
            };
        }

        // Text files don't have magic bytes - allow based on extension
        if (claimedMimeType === "text/plain" || claimedMimeType === "text/csv") {
            // Check if content appears to be valid text (no null bytes in first 16)
            const hasNullByte = bytes.some((b) => b === 0);
            if (hasNullByte) {
                return {
                    valid: false,
                    detectedType: null,
                    reason: "File appears to be binary, not text",
                };
            }
            return { valid: true, detectedType: claimedMimeType };
        }

        // For ZIP-based formats (OOXML), we just check the PK signature
        // A more thorough check would unzip and verify content types

        // Check magic bytes
        const signatures = MAGIC_BYTES[claimedMimeType];
        if (!signatures || signatures.length === 0) {
            // No signature defined, can't validate
            return { valid: true, detectedType: claimedMimeType };
        }

        const matchesSignature = signatures.some((sig) => {
            const offset = sig.offset || 0;
            return sig.signature.every((byte, index) => bytes[offset + index] === byte);
        });

        if (!matchesSignature) {
            // Try to detect what it actually is
            const detectedType = detectMimeType(bytes);
            return {
                valid: false,
                detectedType,
                reason: `File signature doesn't match claimed type "${claimedMimeType}"${detectedType ? `. Detected: ${detectedType}` : ""}`,
            };
        }

        return { valid: true, detectedType: claimedMimeType };
    } catch (error) {
        console.error("File validation error:", error);
        return {
            valid: false,
            detectedType: null,
            reason: "Failed to validate file",
        };
    }
}

/**
 * Detect MIME type from magic bytes
 */
function detectMimeType(bytes: Uint8Array): string | null {
    for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
        if (signatures.length === 0) continue;

        const matches = signatures.some((sig) => {
            const offset = sig.offset || 0;
            return sig.signature.every((byte, index) => bytes[offset + index] === byte);
        });

        if (matches) {
            return mimeType;
        }
    }
    return null;
}

/**
 * Validate file size
 */
export function validateFileSize(
    sizeBytes: number,
    maxSizeMB: number = 10
): { valid: boolean; reason?: string } {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (sizeBytes > maxBytes) {
        return {
            valid: false,
            reason: `File size ${(sizeBytes / 1024 / 1024).toFixed(2)}MB exceeds maximum ${maxSizeMB}MB`,
        };
    }
    return { valid: true };
}

/**
 * Combined file validation
 */
export async function validateUploadedFile(
    file: File,
    options: { maxSizeMB?: number } = {}
): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Size check
    const sizeResult = validateFileSize(file.size, options.maxSizeMB);
    if (!sizeResult.valid && sizeResult.reason) {
        errors.push(sizeResult.reason);
    }

    // Type check
    const typeResult = await validateFileType(file, file.type);
    if (!typeResult.valid && typeResult.reason) {
        errors.push(typeResult.reason);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
