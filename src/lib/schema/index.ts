module.exports.create = (
  tablePrefix,
  schema = null,
  eventTable = "event_journal",
  snapshotTable = "snapshot_store"
) => {
  const schemaQuery = `
    CREATE SCHEMA IF NOT EXISTS ${schema};
  `;

  const _eventTable = `${
    schema ? schema + "." : ""
  }${tablePrefix}${eventTable}`;
  const _snapshotTable = `${
    schema ? schema + "." : ""
  }${tablePrefix}${snapshotTable}`;

  const eventTableQuery = `
    CREATE TABLE IF NOT EXISTS ${_eventTable} (
      ordering INTEGER PRIMARY KEY AUTOINCREMENT,
      persistence_key TEXT NOT NULL,
      sequence_nr INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      tags TEXT,
      CONSTRAINT ${tablePrefix}${eventTable}_uq UNIQUE (persistence_key, sequence_nr)
    );
  `;

  const snapshotTableQuery = `
    CREATE TABLE IF NOT EXISTS ${_snapshotTable} (
      ordering INTEGER PRIMARY KEY AUTOINCREMENT,
      persistence_key TEXT NOT NULL,
      sequence_nr INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0
    );
  `;

  return [schema ? schemaQuery : null, eventTableQuery, snapshotTableQuery]
    .filter((n) => n)
    .join("\n");
};
