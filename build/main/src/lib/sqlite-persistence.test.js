"use strict";
/* eslint-env jest */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const persistence_1 = require("@nact/persistence");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsaXRlLXBlcnNpc3RlbmNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL3NxbGl0ZS1wZXJzaXN0ZW5jZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxQkFBcUI7Ozs7O0FBRXJCLDRDQUFvQjtBQUVwQixtREFBc0U7QUFFdEUsNkRBQStEO0FBRS9ELE1BQU0sVUFBVSxHQUFHLGdDQUFnQyxDQUFDO0FBRXBELE1BQU0sT0FBTyxHQUFHLEdBQUcsRUFBRTtJQUNuQixJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1FBQUUsWUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUM7QUFFRixRQUFRLENBQUMseUJBQXlCLEVBQUU7SUFDbEMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNuQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFcEIsRUFBRSxDQUFDLGlDQUFpQyxFQUFFO1lBQ3BDLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSw0Q0FBdUIsQ0FBQyxVQUFVLEVBQUU7Z0JBQ3JELGlCQUFpQixFQUFFLElBQUk7YUFDeEIsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxTQUFTLEdBQUcsSUFBSSwrQkFBaUIsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQy9FLE1BQU0sU0FBUyxHQUFHLElBQUksK0JBQWlCLENBQUMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNqRixNQUFNLFNBQVMsR0FBRyxJQUFJLCtCQUFpQixDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFB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