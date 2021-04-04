import assert from 'assert';
import fs from 'fs';

import Sqlite from 'better-sqlite3';
// @ts-expect-error Untyped import
import { AbstractPersistenceEngine, PersistedEvent, PersistedSnapshot } from 'nact/lib/persistence';

import { create } from './schema';

class Result<TResult> {
  readonly promise: Promise<TResult>;

  constructor(result: TResult) {
    this.promise = Promise.resolve(result);
  }

  then(fn: (value: TResult) => TResult | PromiseLike<TResult>): Promise<TResult> {
    return this.promise.then(fn);
  }

  reduce<U>(fn: (prev: U, curr: TResult) => U): Promise<U> {
    // @ts-expect-error Property 'reduce' does not exist on type 'TResult'.
    return this.promise.then((result) => result.reduce(fn));
  }
}

type DBEvent = {
  readonly persistence_key: string;
  readonly sequence_nr: number;
  readonly data: string;
  readonly tags: string;
  readonly created_at: number;
  readonly is_deleted: number;
};

type DBSnapshot = {
  readonly persistence_key: string;
  readonly sequence_nr: number;
  readonly data: string;
  readonly created_at: number;
};

export class SQLitePersistenceEngine extends AbstractPersistenceEngine {
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

  constructor(
    filename: string,
    {
      createIfNotExists = true,
      tablePrefix = '',
      schema = undefined,
      eventTable = 'event_journal',
      snapshotTable = 'snapshot_store',
    } = {}
  ) {
    super();
    this.tablePrefix = tablePrefix;
    this.schema = schema;
    this.eventTable = eventTable;
    this.snapshotTable = snapshotTable;
    this.db = Sqlite(filename, { fileMustExist: !createIfNotExists });
    this.db.pragma('synchronous = FULL');
    this.db.pragma('journal_mode = WAL');
    this.db.exec(create(tablePrefix, eventTable, snapshotTable, schema));
    this.prepareStatements();
    this.timerId = setInterval(() => {
      try {
        fs.statSync(filename);
      } catch (err) {
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

  static mapDbModelToDomainModel(dbEvent: DBEvent): PersistedEvent {
    return new PersistedEvent(
      JSON.parse(dbEvent.data),
      // Number.parseInt(dbEvent.sequence_nr),
      dbEvent.sequence_nr,
      dbEvent.persistence_key,
      JSON.parse(dbEvent.tags),
      // Number.parseInt(dbEvent.created_at),
      dbEvent.created_at,
      !!dbEvent.is_deleted
    );
  }

  static mapDbModelToSnapshotDomainModel(dbSnapshot: DBSnapshot): PersistedSnapshot | undefined {
    if (dbSnapshot) {
      return new PersistedSnapshot(
        JSON.parse(dbSnapshot.data),
        // Number.parseInt(dbSnapshot.sequence_nr),
        dbSnapshot.sequence_nr,
        dbSnapshot.persistence_key,
        // Number.parseInt(dbSnapshot.created_at)
        dbSnapshot.created_at
      );
    }
    return;
  }

  prepareStatements() {
    const _eventTable = `${this.schema ? this.schema + '.' : ''}${this.tablePrefix}${
      this.eventTable
    }`;
    const _snapshotTable = `${this.schema ? this.schema + '.' : ''}${this.tablePrefix}${
      this.snapshotTable
    }`;

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

  events(persistenceKey: string, offset = 0, limit = 1000000, tags?: readonly string[]) {
    return new Result(this.eventsSync(persistenceKey, offset, limit, tags));
  }

  eventsSync(persistenceKey: string, offset = 0, limit = 1000000, tags?: readonly string[]) {
    assert(typeof persistenceKey === 'string');
    assert(Number.isInteger(offset));
    assert(Number.isInteger(limit));
    assert(
      tags === undefined ||
        (tags instanceof Array &&
          tags.reduce((isStrArr, curr) => isStrArr && typeof curr === 'string', true))
    );

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
      const hasAllTags = (event: PersistedEvent) => tags.every((tag) => event.tags.includes(tag));

      return events?.filter(hasAllTags);
    }

    return events;
  }

  async persist(persistedEvent: PersistedEvent) {
    return new Result(this.persistSync(persistedEvent));
  }

  persistSync(persistedEvent: PersistedEvent) {
    if (persistedEvent === undefined) return;

    if (!this.insertEvent) {
      throw new Error(`DB Statements not initialized!`);
    }

    const { lastInsertRowid } = this.insertEvent.run({
      ...persistedEvent,
      data: JSON.stringify(persistedEvent.data),
      tags: JSON.stringify(persistedEvent.tags),
    });

    return lastInsertRowid;
  }

  async latestSnapshot(persistenceKey: string) {
    return new Result(this.latestSnapshotSync(persistenceKey));
  }

  latestSnapshotSync(persistenceKey: string) {
    assert(typeof persistenceKey === 'string');

    if (!this.selectLatestSnapshot) {
      throw new Error(`DB Statements not initialized!`);
    }

    const snap = this.selectLatestSnapshot.get(persistenceKey);

    return SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel(snap);
  }

  async takeSnapshot(persistedSnapshot: PersistedSnapshot) {
    return new Result(this.takeSnapshotSync(persistedSnapshot));
  }

  takeSnapshotSync(persistedSnapshot: PersistedSnapshot) {
    assert(typeof persistedSnapshot.key === 'string');
    assert(Number.isInteger(persistedSnapshot.sequenceNumber));

    if (!this.insertSnapshot) {
      throw new Error(`DB Statements not initialized!`);
    }

    const { lastInsertRowid } = this.insertSnapshot.run({
      ...persistedSnapshot,
      data: JSON.stringify(persistedSnapshot.data),
    });

    return lastInsertRowid;
  }
}
