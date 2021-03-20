const {
  AbstractPersistenceEngine,
  PersistedEvent,
  PersistedSnapshot,
} = require("nact/lib/persistence");
const Database = require("better-sqlite3");
const { create } = require("./schema");
const assert = require("assert");

class Result {
  constructor(promise) {
    this.promise = promise;
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
      dbEvent.data,
      Number.parseInt(dbEvent.sequence_nr),
      dbEvent.persistence_key,
      dbEvent.tags,
      Number.parseInt(dbEvent.created_at),
      !!dbEvent.is_deleted
    );
  }

  static mapDbModelToSnapshotDomainModel(dbSnapshot) {
    if (dbSnapshot) {
      return new PersistedSnapshot(
        dbSnapshot.data,
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
      WHERE persistence_key = $1 
        AND sequence_nr > $2
      ORDER BY sequence_nr
      LIMIT $3`;
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
      WHERE persistence_key = $1
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
      VALUES (?, ?, ?, ?)`;
    // console.log(insertSnapshot);
    this.insertSnapshot = this.db.prepare(insertSnapshot);
  }

  events(persistenceKey, offset = 0, limit = null, tags = undefined) {
    assert(typeof persistenceKey === "string");
    assert(Number.isInteger(offset));
    assert(Number.isInteger(limit) || limit === null);
    assert(
      tags === undefined
      // Ignoring `tags` on first pass as I don't use them myself. [nprbst]
      // ||
      // (tags instanceof Array &&
      //   tags.reduce(
      //     (isStrArr, curr) => isStrArr && typeof curr === "string",
      //     true
      //   ))
    );

    // const args = [persistenceKey, offset, limit, tags].filter(
    //   (x) => x !== undefined
    // );

    const result = this.selectEvents
      .all(persistenceKey, offset, limit)
      .then((results) =>
        results.map(SQLitePersistenceEngine.mapDbModelToDomainModel)
      );
    return new Result(result);
  }

  async persist(persistedEvent) {
    const info = this.insertEvent.run(persistedEvent);

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

  async latestSnapshot(persistenceKey) {
    assert(typeof persistenceKey === "string");

    return this.selectLatestSnapshot
      .get(persistenceKey)
      .then(SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
  }

  async takeSnapshot(persistedSnapshot) {
    assert(typeof persistedSnapshot.key === "string");
    assert(Number.isInteger(persistedSnapshot.sequenceNumber));

    console.log("takeSnapshot(persistedSnapshot)", persistedSnapshot);

    const info = this.insertSnapshot.run(
      persistedSnapshot.key,
      persistedSnapshot.sequenceNumber,
      persistedSnapshot.createdAt,
      persistedSnapshot.data
    );
    // INTEGER PRIMARY KEY == RowID
    const ordering = info.lastInsertRowid;
    return ordering;
  }
}

module.exports.SQLitePersistenceEngine = SQLitePersistenceEngine;
