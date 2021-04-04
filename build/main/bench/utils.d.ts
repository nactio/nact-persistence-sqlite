import { PersistedEvent, PersistedSnapshot } from '@nact/persistence';
export declare const delay: (ms: number) => Promise<unknown>;
export declare const destroy: (dbFilename: any) => void;
export declare const makeEvent: (i: number, key: string) => PersistedEvent;
export declare const makeSnapshot: (i: number, key: string) => PersistedSnapshot;
