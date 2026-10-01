import type { Db } from 'mongodb';
export function createCollections(db: Db): Promise<void>;
export function loadDefinitions(): Array<{ collection: string; jsonSchema: Record<string, unknown>; indexes: Array<{ key: Record<string, 1 | -1>; options?: Record<string, unknown> }> }>;
