"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLitePersistenceEngine = void 0;
const fs_1 = __importDefault(require("fs"));
const core_1 = require("@nact/core");
const persistence_1 = require("@nact/persistence");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
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
        core_1.assert(typeof persistenceKey === 'string');
        core_1.assert(Number.isInteger(offset));
        core_1.assert(Number.isInteger(limit));
        core_1.assert(tags === undefined ||
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
            // @ts-expect-error Property 'tags' does not exist on type 'PersistedEvent'.
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
        const { lastInsertRowid } = this.insertEvent.run(Object.assign(Object.assign({}, persistedEvent), { 
            // @ts-expect-error Property 'data' does not exist on type 'PersistedEvent'.
            data: JSON.stringify(persistedEvent.data), 
            // @ts-expect-error Property 'tags' does not exist on type 'PersistedEvent'.
            tags: JSON.stringify(persistedEvent.tags) }));
        return lastInsertRowid;
    }
    async latestSnapshot(persistenceKey) {
        return new Result(this.latestSnapshotSync(persistenceKey));
    }
    latestSnapshotSync(persistenceKey) {
        core_1.assert(typeof persistenceKey === 'string');
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
        // @ts-expect-error Property 'key' does not exist on type 'PersistedEvent'.
        core_1.assert(typeof persistedSnapshot.key === 'string');
        // @ts-expect-error Property 'sequenceNumber' does not exist on type 'PersistedEvent'.
        core_1.assert(Number.isInteger(persistedSnapshot.sequenceNumber));
        if (!this.insertSnapshot) {
            throw new Error(`DB Statements not initialized!`);
        }
        const { lastInsertRowid } = this.insertSnapshot.run(Object.assign(Object.assign({}, persistedSnapshot), { 
            // @ts-expect-error Property 'data' does not exist on type 'PersistedEvent'.
            data: JSON.stringify(persistedSnapshot.data) }));
        return lastInsertRowid;
    }
}
exports.SQLitePersistenceEngine = SQLitePersistenceEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsaXRlLXBlcnNpc3RlbmNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2xpYi9zcWxpdGUtcGVyc2lzdGVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNENBQW9CO0FBRXBCLHFDQUFvQztBQUNwQyxtREFBaUc7QUFDakcsb0VBQW9DO0FBRXBDLHFDQUFrQztBQUVsQyxNQUFNLE1BQU07SUFHVixZQUFZLE1BQWU7UUFDekIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxJQUFJLENBQUMsRUFBc0Q7UUFDekQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsTUFBTSxDQUFJLEVBQWlDO1FBQ3pDLHVFQUF1RTtRQUN2RSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztDQUNGO0FBa0JELE1BQWEsdUJBQXdCLFNBQVEsdUNBQXlCO0lBY3BFLFlBQ0UsUUFBZ0IsRUFDaEIsRUFDRSxpQkFBaUIsR0FBRyxJQUFJLEVBQ3hCLFdBQVcsR0FBRyxFQUFFLEVBQ2hCLE1BQU0sR0FBRyxTQUFTLEVBQ2xCLFVBQVUsR0FBRyxlQUFlLEVBQzVCLGFBQWEsR0FBRyxnQkFBZ0IsR0FDakMsR0FBRyxFQUFFO1FBRU4sS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztRQUNu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