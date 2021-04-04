"use strict";
/* eslint-env jest */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
// @ts-expect-error Untyped import
const persistence_1 = require("nact/lib/persistence");
const sqlite_persistence_1 = require("./sqlite-persistence");
const dbFilename = 'test-sqlite-persistence.sqlite';
const destroy = () => {
    if (fs_1.default.existsSync(dbFilename))
        fs_1.default.unlinkSync(dbFilename);
};
describe('SQLitePersistenceEngine', function () {
    describe('existing connection', () => {
        beforeEach(destroy);
        it('should store values in database', function () {
            const date = new Date().getTime();
            const engine = new sqlite_persistence_1.SQLitePersistenceEngine(dbFilename, {
                createIfNotExists: true,
            });
            const snapshot1 = new persistence_1.PersistedSnapshot({ message: 'hello' }, 1, 'test', date);
            const snapshot2 = new persistence_1.PersistedSnapshot({ message: 'goodbye' }, 2, 'test', date);
            const snapshot3 = new persistence_1.PersistedSnapshot({ message: 'hello' }, 1, 'test2', date);
            engine.takeSnapshot(snapshot1);
            engine.takeSnapshot(snapshot2);
            engine.takeSnapshot(snapshot3);
            const result = engine.db
                .prepare("SELECT * FROM snapshot_store WHERE persistence_key = 'test' ORDER BY sequence_nr")
                .all()
                .map(sqlite_persistence_1.SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
            expect(result).toHaveLength(2);
            expect(result).toEqual([snapshot1, snapshot2]);
            const result2 = engine.db
                .prepare("SELECT * FROM snapshot_store WHERE persistence_key = 'test2'")
                .all()
                .map(sqlite_persistence_1.SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
            expect(result2).toHaveLength(1);
            expect(result2).toEqual([snapshot3]);
        });
    });
    describe('#persist', function () {
        beforeEach(destroy);
        const date = new Date().getTime();
        it('should store values in database', async function () {
            const engine = new sqlite_persistence_1.SQLitePersistenceEngine(dbFilename, {
                createIfNotExists: true,
            });
            const event1 = new persistence_1.PersistedEvent({ message: 'hello' }, 1, 'test', ['a', 'b', 'c'], date);
            const event2 = new persistence_1.PersistedEvent(['message', 'goodbye'], 2, 'test', undefined, date);
            const event3 = new persistence_1.PersistedEvent({ message: 'hello' }, 1, 'test2', undefined, date);
            engine.persist(event1);
            engine.persist(event2);
            engine.persist(event3);
            const result = engine.db
                .prepare("SELECT * FROM event_journal WHERE persistence_key = 'test' ORDER BY sequence_nr")
                .all()
                .map(sqlite_persistence_1.SQLitePersistenceEngine.mapDbModelToDomainModel);
            expect(result).toHaveLength(2);
            expect(result).toEqual([event1, event2]);
            const result2 = engine.db
                .prepare("SELECT * FROM event_journal WHERE persistence_key = 'test2'")
                .all()
                .map(sqlite_persistence_1.SQLitePersistenceEngine.mapDbModelToDomainModel);
            expect(result2).toHaveLength(1);
            expect(result2).toEqual([event3]);
        });
    });
    describe('#takeSnapshot', function () {
        beforeEach(destroy);
        const date = new Date().getTime();
        it('should store values in database', async () => {
            const engine = new sqlite_persistence_1.SQLitePersistenceEngine(dbFilename, {
                createIfNotExists: true,
            });
            const snapshot1 = new persistence_1.PersistedSnapshot({ message: 'hello' }, 1, 'test', date);
            const snapshot2 = new persistence_1.PersistedSnapshot({ message: 'goodbye' }, 2, 'test', date);
            const snapshot3 = new persistence_1.PersistedSnapshot({ message: 'hello' }, 1, 'test2', date);
            engine.takeSnapshot(snapshot1);
            engine.takeSnapshot(snapshot2);
            engine.takeSnapshot(snapshot3);
            const result = engine.db
                .prepare("SELECT * FROM snapshot_store WHERE persistence_key = 'test' ORDER BY sequence_nr")
                .all()
                .map(sqlite_persistence_1.SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
            expect(result).toHaveLength(2);
            expect(result).toEqual([snapshot1, snapshot2]);
            const result2 = engine.db
                .prepare("SELECT * FROM snapshot_store WHERE persistence_key = 'test2'")
                .all()
                .map(sqlite_persistence_1.SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
            expect(result2).toHaveLength(1);
            expect(result2).toEqual([snapshot3]);
        });
        it('should store arrays in database', function () {
            const engine = new sqlite_persistence_1.SQLitePersistenceEngine(dbFilename, {
                createIfNotExists: true,
            });
            const snapshot1 = new persistence_1.PersistedSnapshot(['hello'], 1, 'test3', date);
            const snapshot2 = new persistence_1.PersistedSnapshot(['goodbye'], 2, 'test3', date);
            const snapshot3 = new persistence_1.PersistedSnapshot(['hello'], 1, 'test4', date);
            engine.takeSnapshot(snapshot1);
            engine.takeSnapshot(snapshot2);
            engine.takeSnapshot(snapshot3);
            const result = engine.db
                .prepare("SELECT * FROM snapshot_store WHERE persistence_key = 'test3' ORDER BY sequence_nr")
                .all()
                .map(sqlite_persistence_1.SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
            expect(result).toHaveLength(2);
            expect(result).toEqual([snapshot1, snapshot2]);
            const result2 = engine.db
                .prepare("SELECT * FROM snapshot_store WHERE persistence_key = 'test4'")
                .all()
                .map(sqlite_persistence_1.SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
            expect(result2).toHaveLength(1);
            expect(result2).toEqual([snapshot3]);
        });
    });
    describe('#latestSnapshot', function () {
        const date = new Date().getTime();
        const snapshot1 = new persistence_1.PersistedSnapshot({ message: 'hello' }, 1, 'test3', date);
        const snapshot2 = new persistence_1.PersistedSnapshot({ message: 'goodbye' }, 2, 'test3', date);
        const snapshot3 = new persistence_1.PersistedSnapshot({ message: 'hello again' }, 3, 'test3', date);
        let engine;
        beforeEach(() => {
            destroy();
            engine = new sqlite_persistence_1.SQLitePersistenceEngine(dbFilename, {
                createIfNotExists: true,
            });
            engine.takeSnapshot(snapshot1);
            engine.takeSnapshot(snapshot2);
            engine.takeSnapshot(snapshot3);
        });
        it('should be able to retrieve latest snapshot', async () => {
            const result = await engine.latestSnapshot('test3');
            expect(result).toEqual(snapshot3);
        });
        it('should be able to correct handle cases where no snapshot is available', async () => {
            const result = await engine.latestSnapshot('test4');
            expect(result).toBeUndefined();
        });
    });
    describe('#events', function () {
        const date = new Date().getTime();
        const event1 = new persistence_1.PersistedEvent({ message: 'hello' }, 1, 'test3', ['a', 'b', 'c'], date);
        const event2 = new persistence_1.PersistedEvent({ message: 'goodbye' }, 2, 'test3', ['a'], date);
        const event3 = new persistence_1.PersistedEvent({ message: 'hello again' }, 3, 'test3', ['b', 'c'], date);
        let engine;
        beforeEach(() => {
            destroy();
            engine = new sqlite_persistence_1.SQLitePersistenceEngine(dbFilename, {
                createIfNotExists: true,
            });
            engine.persist(event1);
            engine.persist(event2);
            engine.persist(event3);
        });
        it('should be able to retrieve previously persisted events', async function () {
            const result = (await engine.events('test3')).reduce((prev, evt) => [...prev, evt], []);
            expect(result).toEqual([event1, event2, event3]);
        });
        it('should be able to specify an offset of previously persisted events', async function () {
            const result = (await engine.events('test3', 1)).reduce((prev, evt) => [...prev, evt], []);
            expect(result).toEqual([event2, event3]);
        });
        it('should be able to filter by tag', async function () {
            const result = await engine.events('test3', undefined, undefined, ['b', 'c']);
            expect(result).toEqual([event1, event3]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsaXRlLXBlcnNpc3RlbmNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL3NxbGl0ZS1wZXJzaXN0ZW5jZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxQkFBcUI7Ozs7O0FBRXJCLDRDQUFvQjtBQUVwQixrQ0FBa0M7QUFDbEMsc0RBQXlFO0FBRXpFLDZEQUErRDtBQUUvRCxNQUFNLFVBQVUsR0FBRyxnQ0FBZ0MsQ0FBQztBQUVwRCxNQUFNLE9BQU8sR0FBRyxHQUFHLEVBQUU7SUFDbkIsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUFFLFlBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDM0QsQ0FBQyxDQUFDO0FBRUYsUUFBUSxDQUFDLHlCQUF5QixFQUFFO0lBQ2xDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDbkMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXBCLEVBQUUsQ0FBQyxpQ0FBaUMsRUFBRTtZQUNwQyxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksNENBQXVCLENBQUMsVUFBVSxFQUFFO2dCQUNyRCxpQkFBaUIsRUFBRSxJQUFJO2FBQ3hCLENBQUMsQ0FBQztZQUNILE1BQU0sU0FBUyxHQUFHLElBQUksK0JBQWlCLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMvRSxNQUFNLFNBQVMsR0FBRyxJQUFJLCtCQUFpQixDQUFDLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakYsTUFBTSxTQUFTLEdBQUcsSUFBSSwrQkFBaUIsQ0FBQyxFQUFFLE9BQU8sRUFB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