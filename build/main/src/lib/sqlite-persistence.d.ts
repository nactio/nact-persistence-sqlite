/// <reference types="node" />
import { AbstractPersistenceEngine, PersistedEvent, PersistedSnapshot } from '@nact/persistence';
import Sqlite from 'better-sqlite3';
declare class Result<TResult> {
    readonly promise: Promise<TResult>;
    constructor(result: TResult);
    then(fn: (value: TResult) => TResult | PromiseLike<TResult>): Promise<TResult>;
    reduce<U>(fn: (prev: U, curr: TResult) => U): Promise<U>;
}
declare type DBEvent = {
    readonly persistence_key: string;
    readonly sequence_nr: number;
    readonly data: string;
    readonly tags: string;
    readonly created_at: number;
    readonly is_deleted: number;
};
declare type DBSnapshot = {
    readonly persistence_key: string;
    readonly sequence_nr: number;
    readonly data: string;
    readonly created_at: number;
};
export declare class SQLitePersistenceEngine extends AbstractPersistenceEngine {
    readonly schema?: string;
    readonly tablePrefix: string;
    readonly eventTable: string;
    readonly snapshotTable: string;
    db: Sqlite.Database;
    selectEvents?: Sqlite.Statement<[string, number, number]>;
    insertEvent?: Sqlite.Statement<PersistedEvent>;
    selectLatestSnapshot?: Sqlite.Statement<string>;
    insertSnapshot?: Sqlite.Statement<PersistedSnapshot>;
    timerId: NodeJS.Timeout;
    constructor(filename: string, { createIfNotExists, tablePrefix, schema, eventTable, snapshotTable, }?: {
        createIfNotExists?: boolean | undefined;
        tablePrefix?: string | undefined;
        schema?: undefined;
        eventTable?: string | undefined;
        snapshotTable?: string | undefined;
    });
    close(): void;
    static mapDbModelToDomainModel(dbEvent: DBEvent): PersistedEvent;
    static mapDbModelToSnapshotDomainModel(dbSnapshot: DBSnapshot): PersistedSnapshot | undefined;
    prepareStatements(): void;
    events(persistenceKey: string, offset?: number, limit?: number, tags?: readonly string[]): Result<PersistedEvent[]>;
    eventsSync(persistenceKey: string, offset?: number, limit?: number, tags?: readonly string[]): PersistedEvent[];
    persist(persistedEvent: PersistedEvent): Promise<string | number | import("integer").IntClass | undefined>;
    persistSync(persistedEvent: PersistedEvent): string | number | import("integer").IntClass | undefined;
    latestSnapshot(persistenceKey: string): Promise<PersistedSnapshot | undefined>;
    latestSnapshotSync(persistenceKey: string): PersistedSnapshot | undefined;
    takeSnapshot(persistedSnapshot: PersistedSnapshot): Promise<import("integer").IntLike>;
    takeSnapshotSync(persistedSnapshot: PersistedSnapshot): import("integer").IntLike;
}
export {};
