import type { Remote } from 'comlink';
import { wrap } from 'comlink';
import type { WorkerAPI } from '../workers/worker';
import type { FlatRow, EnumOptionMap, QueryInput } from '../types/data';

const DATA_URL = new URL('../assets/data/large.json?url', import.meta.url).href;

let remote: Remote<WorkerAPI> | null = null;

export async function getWorker(): Promise<Remote<WorkerAPI>> {
    if (!remote) {
        const worker = new Worker(new URL('@/workers/worker.ts', import.meta.url), { type: 'module' });
        remote = wrap<WorkerAPI>(worker);
    }
    return remote;
}

export async function loadData(keys: Array<keyof FlatRow>): Promise<{ count: number }> {
    const w = await getWorker();
    return w.load(DATA_URL, keys);
}

export async function fetchDistinct(): Promise<EnumOptionMap> {
    const w = await getWorker();
    return w.distinct();
}

export interface QueryResult {
    rows: FlatRow[];
    total: number;
}

export async function queryRows(input: QueryInput): Promise<QueryResult> {
    const w = await getWorker();
    return w.query(input);
}
