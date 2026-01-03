
// src/core/base.server.ts
import { createServerFn } from '@tanstack/react-start';
import { authMiddleware } from './middleware/auth-middleware';

export const authenticatedFn = createServerFn()
    .middleware([authMiddleware]);
