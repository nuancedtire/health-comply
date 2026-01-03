import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const getDb = (d1: D1Database) => {
    // If d1 is undefined (during build or specific dev scenarios), return a dummy that won't crash 
    // immediately on initialization but will fail on query.
    if (!d1) {
        console.warn("getDb: d1 is undefined, returning manual shim");
        return {
            select: () => ({ from: () => [], where: () => ({ get: () => null }) }),
            insert: () => ({ values: () => ({}) }),
        } as any;
    }
    try {
        console.log("getDb: initializing drizzle with d1 keys:", Object.keys(d1));
        return drizzle(d1, { schema });
    } catch (e) {
        console.error("getDb: failed to initialize drizzle", e);
        throw e;
    }
};
