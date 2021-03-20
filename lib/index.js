const {
  AbstractPersistenceEngine,
  PersistedEvent,
  PersistedSnapshot
} = require('nact/lib/persistence');
const Database = require('better-sqlite3');
const { create } = require('./schema');
const assert = require('assert');

class Result {
  constructor (promise) {
    this.promise = promise;
  }
  then (...args) {
    return this.promise.then(...args);
  }
  reduce (...args) {
    return this.promise.then((result) => result.reduce(...args));
  }
}

class SQLitePersistenceEngine extends AbstractPersistenceEngine {
  constructor (
    filename,
    {
      createIfNotExists = true,
      tablePrefix = '',
      schema = null,
      eventTable = 'event_journal',
      snapshotTable = 'snapshot_store'
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

  static mapDbModelToDomainModel (dbEvent) {
    return new PersistedEvent(
      dbEvent.data,
      Number.parseInt(dbEvent.sequence_nr),
      dbEvent.persistence_key,
      dbEvent.tags,
      Number.parseInt(dbEvent.created_at),
      !!dbEvent.is_deleted
    );
  }

  static mapDbModelToSnapshotDomainModel (dbSnapshot) {
    if (dbSnapshot) {
      return new PersistedSnapshot(
        dbSnapshot.data,
        Number.parseInt(dbSnapshot.sequence_nr),
        dbSnapshot.persistence_key,
        Number.parseInt(dbSnapshot.created_at)
      );
    }
  }

  prepareStatements () {
    const _eventTable = `${this.schema ? this.schema + '.' : ''}${
      this.tablePrefix
    }${this.eventTable}`;
    const _snapshotTable = `${this.schema ? this.schema + '.' : ''}${
      this.tablePrefix
    }${this.snapshotTable}`;

    this.selectEvents = this.db.prepare(
      ` SELECT * from ${_eventTable}
        WHERE persistence_key = $1 AND sequence_nr > $2
        ORDER BY sequence_nr
        LIMIT $3`
    );

    this.insertEvent = this.db.prepare(
      ` INSERT INTO ${_eventTable} (
          persistence_key,
          sequence_nr,
          created_at,
          data,
          tags
        ) VALUES ($/key/, $/sequenceNumber/, $/createdAt/, $/data:json/, $/tags/)
        RETURNING ordering;`
    );

    this.selectLatestSnapshot = this.db.prepare(
      ` SELECT * from ${_snapshotTable}
        WHERE persistence_key = $1
        AND is_deleted = false
        ORDER BY sequence_nr DESC
        LIMIT 1;`
    );

    this.insertSnapshot = this.db.prepare(
      ` INSERT INTO ${_snapshotTable} (
          persistence_key,
          sequence_nr,
          created_at,
          data
        )
        VALUES ($1, $2, $3, $4:json)
        RETURNING ordering;`
    );
  }

  events (persistenceKey, offset = 0, limit = null, tags = undefined) {
    assert(typeof persistenceKey === 'string');
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
      .get(persistenceKey, offset, limit)
      .then((results) =>
        results.map(SQLitePersistenceEngine.mapDbModelToDomainModel)
      );
    return new Result(result);
  }

  async persist (persistedEvent) {
    return this.insertEvent.get(persistedEvent);
    // ({
    // key: persistedEvent.key,
    //   sequenceNumber: persistedEvent.sequenceNumber,
    //   createdAt: persistedEvent.createdAt,
    //   data: persistedEvent.data,
    //   tags: persistedEvent.tags,
    // });
  }

  async latestSnapshot (persistenceKey) {
    assert(typeof persistenceKey === 'string');

    return this.selectLatestSnapshot
      .get(persistenceKey)
      .then(SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
  }

  async takeSnapshot (persistedSnapshot) {
    assert(typeof persistenceKey === 'string');

    return this.insertSnapshot.get(
      persistedSnapshot.key,
      persistedSnapshot.sequenceNumber,
      persistedSnapshot.createdAt,
      persistedSnapshot.data
    );
  }
}

module.exports.SqlitePersistenceEngine = SQLitePersistenceEngine;
