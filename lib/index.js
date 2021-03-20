const {
  AbstractPersistenceEngine,
  PersistedEvent,
  PersistedSnapshot,
} = require("nact/lib/persistence");
const Database = require("better-sqlite3");
const { create } = require("./schema");
const assert = require("assert");

class Result {
  constructor(result) {
    this.promise = Promise.resolve(result);
  }
  then(...args) {
    return this.promise.then(...args);
  }
  reduce(...args) {
    return this.promise.then((result) => result.reduce(...args));
  }
}

class SQLitePersistenceEngine extends AbstractPersistenceEngine {
  constructor(
    filename,
    {
      createIfNotExists = true,
      tablePrefix = "",
      schema = null,
      eventTable = "event_journal",
      snapshotTable = "snapshot_store",
    } = {}
  ) {
    super();
    this.tablePrefix = tablePrefix;
    this.schema = schema;
    this.eventTable = eventTable;
    this.snapshotTable = snapshotTable;
    this.db = Database(filename, { createIfNotExists });
    this.db.exec(create(tablePrefix, schema, eventTable, snapshotTable));
    this.prepareStatements();
  }

  static mapDbModelToDomainModel(dbEvent) {
    return new PersistedEvent(
      JSON.parse(dbEvent.data),
      Number.parseInt(dbEvent.sequence_nr),
      dbEvent.persistence_key,
      JSON.parse(dbEvent.tags),
      Number.parseInt(dbEvent.created_at),
      !!dbEvent.is_deleted
    );
  }

  static mapDbModelToSnapshotDomainModel(dbSnapshot) {
    if (dbSnapshot) {
      return new PersistedSnapshot(
        JSON.parse(dbSnapshot.data),
        Number.parseInt(dbSnapshot.sequence_nr),
        dbSnapshot.persistence_key,
        Number.parseInt(dbSnapshot.created_at)
      );
    }
  }

  prepareStatements() {
    const _eventTable = `${this.schema ? this.schema + "." : ""}${
      this.tablePrefix
    }${this.eventTable}`;
    const _snapshotTable = `${this.schema ? this.schema + "." : ""}${
      this.tablePrefix
    }${this.snapshotTable}`;

    const selectEvents = `
      SELECT * from ${_eventTable}
      WHERE persistence_key = ? 
        AND sequence_nr > ?
      ORDER BY sequence_nr
      LIMIT ?`;
    // console.log(selectEvents);
    this.selectEvents = this.db.prepare(selectEvents);

    const insertEvent = `
      INSERT INTO ${_eventTable} (
        persistence_key,
        sequence_nr,
        created_at,
        data,
        tags
      ) VALUES ($key, $sequenceNumber, $createdAt, $data, $tags);`;
    // console.log(insertEvent);
    this.insertEvent = this.db.prepare(insertEvent);

    const selectLatestSnapshot = `
      SELECT * from ${_snapshotTable}
      WHERE persistence_key = ?
        AND is_deleted = false
      ORDER BY sequence_nr DESC
      LIMIT 1;`;
    // console.log(selectLatestSnapshot);
    this.selectLatestSnapshot = this.db.prepare(selectLatestSnapshot);

    const insertSnapshot = `
      INSERT INTO ${_snapshotTable} (
        persistence_key,
        sequence_nr,
        created_at,
        data
      )
      VALUES ($key, $sequenceNumber, $createdAt, $data);`;
    // console.log(insertSnapshot);
    this.insertSnapshot = this.db.prepare(insertSnapshot);
  }

  events(persistenceKey, offset = 0, limit = 1000000, tags = undefined) {
    assert(typeof persistenceKey === "string");
    assert(Number.isInteger(offset));
    assert(Number.isInteger(limit));
    assert(
      tags === undefined ||
        (tags instanceof Array &&
          tags.reduce(
            (isStrArr, curr) => isStrArr && typeof curr === "string",
            true
          ))
    );

    // const args = [persistenceKey, offset, limit, tags].filter(
    //   (x) => x !== undefined
    // );

    const events = this.selectEvents
      .all(persistenceKey, offset, limit)
      .map(SQLitePersistenceEngine.mapDbModelToDomainModel);

    return new Result(events);
  }

  persist(persistedEvent) {
    // console.warn(`>> persist: `, persistedEvent);

    const info = this.insertEvent.run({
      ...persistedEvent,
      data: JSON.stringify(persistedEvent.data),
      tags: JSON.stringify(persistedEvent.tags),
    });

    // INTEGER PRIMARY KEY == RowID
    const ordering = info.lastInsertRowid;
    return ordering;
    // ({
    // key: persistedEvent.key,
    //   sequenceNumber: persistedEvent.sequenceNumber,
    //   createdAt: persistedEvent.createdAt,
    //   data: persistedEvent.data,
    //   tags: persistedEvent.tags,
    // });
  }

  latestSnapshot(persistenceKey) {
    assert(typeof persistenceKey === "string");

    const snap = this.selectLatestSnapshot.get(persistenceKey);

    return SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel(snap);
  }

  takeSnapshot(persistedSnapshot) {
    assert(typeof persistedSnapshot.key === "string");
    assert(Number.isInteger(persistedSnapshot.sequenceNumber));

    // console.log("takeSnapshot(persistedSnapshot)", persistedSnapshot);

    const { lastInsertRowid } = this.insertSnapshot.run({
      ...persistedSnapshot,
      data: JSON.stringify(persistedSnapshot.data),
    });
    // INTEGER PRIMARY KEY == RowID
    return lastInsertRowid;
  }
}

module.exports.SQLitePersistenceEngine = SQLitePersistenceEngine;
