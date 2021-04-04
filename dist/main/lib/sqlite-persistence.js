"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLitePersistenceEngine = void 0;
const assert_1 = __importDefault(require("assert"));
const fs_1 = __importDefault(require("fs"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
// @ts-expect-error Untyped import
const persistence_1 = require("nact/lib/persistence");
const schema_1 = require("./schema");
class Result {
    constructor(result) {
        this.promise = Promise.resolve(result);
    }
    then(fn) {
        return this.promise.then(fn);
    }
    reduce(fn) {
        // @ts-expect-error Property 'reduce' does not exist on type 'TResult'.
        return this.promise.then((result) => result.reduce(fn));
    }
}
class SQLitePersistenceEngine extends persistence_1.AbstractPersistenceEngine {
    constructor(filename, { createIfNotExists = true, tablePrefix = '', schema = undefined, eventTable = 'event_journal', snapshotTable = 'snapshot_store', } = {}) {
        super();
        this.tablePrefix = tablePrefix;
        this.schema = schema;
        this.eventTable = eventTable;
        this.snapshotTable = snapshotTable;
        this.db = better_sqlite3_1.default(filename, { fileMustExist: !createIfNotExists });
        this.db.pragma('synchronous = FULL');
        this.db.pragma('journal_mode = WAL');
        this.db.exec(schema_1.create(tablePrefix, eventTable, snapshotTable, schema));
        this.prepareStatements();
        this.timerId = setInterval(() => {
            try {
                fs_1.default.statSync(filename);
            }
            catch (err) {
                return;
            }
            // Restart and truncate the WAL if over some size limit...
            // if (!err && stat.size > someUnacceptableSize) {
            // Periodically restart and truncate the WAL...
            console.log('Check-pointing WAL...');
            this.db.pragma('wal_checkpoint(TRUNCATE)');
        }, 5 * 60 * 1000).unref(); // ...every 5 minutes
        process.on('exit', () => this.close());
    }
    close() {
        clearTimeout(this.timerId);
        this.db.close();
    }
    static mapDbModelToDomainModel(dbEvent) {
        return new persistence_1.PersistedEvent(JSON.parse(dbEvent.data), 
        // Number.parseInt(dbEvent.sequence_nr),
        dbEvent.sequence_nr, dbEvent.persistence_key, JSON.parse(dbEvent.tags), 
        // Number.parseInt(dbEvent.created_at),
        dbEvent.created_at, !!dbEvent.is_deleted);
    }
    static mapDbModelToSnapshotDomainModel(dbSnapshot) {
        if (dbSnapshot) {
            return new persistence_1.PersistedSnapshot(JSON.parse(dbSnapshot.data), 
            // Number.parseInt(dbSnapshot.sequence_nr),
            dbSnapshot.sequence_nr, dbSnapshot.persistence_key, 
            // Number.parseInt(dbSnapshot.created_at)
            dbSnapshot.created_at);
        }
        return;
    }
    prepareStatements() {
        const _eventTable = `${this.schema ? this.schema + '.' : ''}${this.tablePrefix}${this.eventTable}`;
        const _snapshotTable = `${this.schema ? this.schema + '.' : ''}${this.tablePrefix}${this.snapshotTable}`;
        const selectEvents = `
      SELECT * from ${_eventTable}
      WHERE persistence_key = ? 
        AND sequence_nr > ?
      ORDER BY sequence_nr
      LIMIT ?`;
        this.selectEvents = this.db.prepare(selectEvents);
        const insertEvent = `
      INSERT INTO ${_eventTable} (
        persistence_key,
        sequence_nr,
        created_at,
        data,
        tags
      ) VALUES ($key, $sequenceNumber, $createdAt, $data, $tags);`;
        this.insertEvent = this.db.prepare(insertEvent);
        const selectLatestSnapshot = `
      SELECT * from ${_snapshotTable}
      WHERE persistence_key = ?
        AND is_deleted = false
      ORDER BY sequence_nr DESC
      LIMIT 1;`;
        this.selectLatestSnapshot = this.db.prepare(selectLatestSnapshot);
        const insertSnapshot = `
      INSERT INTO ${_snapshotTable} (
        persistence_key,
        sequence_nr,
        created_at,
        data
      )
      VALUES ($key, $sequenceNumber, $createdAt, $data);`;
        this.insertSnapshot = this.db.prepare(insertSnapshot);
    }
    events(persistenceKey, offset = 0, limit = 1000000, tags) {
        return new Result(this.eventsSync(persistenceKey, offset, limit, tags));
    }
    eventsSync(persistenceKey, offset = 0, limit = 1000000, tags) {
        assert_1.default(typeof persistenceKey === 'string');
        assert_1.default(Number.isInteger(offset));
        assert_1.default(Number.isInteger(limit));
        assert_1.default(tags === undefined ||
            (tags instanceof Array &&
                tags.reduce((isStrArr, curr) => isStrArr && typeof curr === 'string', true)));
        if (!this.selectEvents) {
            throw new Error(`DB Statements not initialized!`);
        }
        const events = this.selectEvents
            .all(persistenceKey, offset, limit)
            .map(SQLitePersistenceEngine.mapDbModelToDomainModel);
        // Because SQLite doesn't support indexing/querying by array values,
        // we use this as a workaround. In the future we may explore using
        // the json1 extension for a more efficient solution. Or could dynamically
        // build a where clause like:
        //
        // WHERE ... AND tags LIKE '%"tag"1%' AND tags LIKE '%"tag2"%'
        //
        // This works for now and, without testing, there's no guarantee that the
        // above is more performant.
        if (tags) {
            const hasAllTags = (event) => tags.every((tag) => event.tags.includes(tag));
            return events === null || events === void 0 ? void 0 : events.filter(hasAllTags);
        }
        return events;
    }
    async persist(persistedEvent) {
        return new Result(this.persistSync(persistedEvent));
    }
    persistSync(persistedEvent) {
        if (persistedEvent === undefined)
            return;
        if (!this.insertEvent) {
            throw new Error(`DB Statements not initialized!`);
        }
        const { lastInsertRowid } = this.insertEvent.run(Object.assign(Object.assign({}, persistedEvent), { data: JSON.stringify(persistedEvent.data), tags: JSON.stringify(persistedEvent.tags) }));
        return lastInsertRowid;
    }
    async latestSnapshot(persistenceKey) {
        return new Result(this.latestSnapshotSync(persistenceKey));
    }
    latestSnapshotSync(persistenceKey) {
        assert_1.default(typeof persistenceKey === 'string');
        if (!this.selectLatestSnapshot) {
            throw new Error(`DB Statements not initialized!`);
        }
        const snap = this.selectLatestSnapshot.get(persistenceKey);
        return SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel(snap);
    }
    async takeSnapshot(persistedSnapshot) {
        return new Result(this.takeSnapshotSync(persistedSnapshot));
    }
    takeSnapshotSync(persistedSnapshot) {
        assert_1.default(typeof persistedSnapshot.key === 'string');
        assert_1.default(Number.isInteger(persistedSnapshot.sequenceNumber));
        if (!this.insertSnapshot) {
            throw new Error(`DB Statements not initialized!`);
        }
        const { lastInsertRowid } = this.insertSnapshot.run(Object.assign(Object.assign({}, persistedSnapshot), { data: JSON.stringify(persistedSnapshot.data) }));
        return lastInsertRowid;
    }
}
exports.SQLitePersistenceEngine = SQLitePersistenceEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsaXRlLXBlcnNpc3RlbmNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9zcWxpdGUtcGVyc2lzdGVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsb0RBQTRCO0FBQzVCLDRDQUFvQjtBQUVwQixvRUFBb0M7QUFDcEMsa0NBQWtDO0FBQ2xDLHNEQUFvRztBQUVwRyxxQ0FBa0M7QUFFbEMsTUFBTSxNQUFNO0lBR1YsWUFBWSxNQUFlO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQsSUFBSSxDQUFDLEVBQXNEO1FBQ3pELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU0sQ0FBSSxFQUFpQztRQUN6Qyx1RUFBdUU7UUFDdkUsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7Q0FDRjtBQWtCRCxNQUFhLHVCQUF3QixTQUFRLHVDQUF5QjtJQWNwRSxZQUNFLFFBQWdCLEVBQ2hCLEVBQ0UsaUJBQWlCLEdBQUcsSUFBSSxFQUN4QixXQUFXLEdBQUcsRUFBRSxFQUNoQixNQUFNLEdBQUcsU0FBUyxFQUNsQixVQUFVLEdBQUcsZUFBZSxFQUM1QixhQUFhLEdBQUcsZ0JBQWdCLEdBQ2pDLEdBQUcsRUFBRTtRQUVOLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFh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