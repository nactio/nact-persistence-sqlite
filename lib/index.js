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

  async events(persistenceKey, offset = 0, limit = 1000000, tags = undefined) {
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

    let events = this.selectEvents
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

    if (!!tags) {
      const hasAllTags = (event) =>
        tags.every((tag) => event.tags.includes(tag));

      return new Result(events.filter(hasAllTags));
    }

    return new Result(events);
  }

  async persist(persistedEvent) {
    const { lastInsertRowid } = this.insertEvent.run({
      ...persistedEvent,
      data: JSON.stringify(persistedEvent.data),
      tags: JSON.stringify(persistedEvent.tags),
    });

    // INTEGER PRIMARY KEY == RowID
    return new Result(lastInsertRowid);
  }

  async latestSnapshot(persistenceKey) {
    assert(typeof persistenceKey === "string");

    const snap = this.selectLatestSnapshot.get(persistenceKey);

    return new Result(
      SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel(snap)
    );
  }

  async takeSnapshot(persistedSnapshot) {
    assert(typeof persistedSnapshot.key === "string");
    assert(Number.isInteger(persistedSnapshot.sequenceNumber));

    const { lastInsertRowid } = this.insertSnapshot.run({
      ...persistedSnapshot,
      data: JSON.stringify(persistedSnapshot.data),
    });
    // ordering INTEGER PRIMARY KEY == RowID
    return new Result(lastInsertRowid);
  }
}

module.exports.SQLitePersistenceEngine = SQLitePersistenceEngine;
