"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
const create = (tablePrefix, eventTable = 'event_journal', snapshotTable = 'snapshot_store', schema) => {
    const schemaQuery = `
    CREATE SCHEMA IF NOT EXISTS ${schema};
  `;
    const _eventTable = `${schema ? schema + '.' : ''}${tablePrefix}${eventTable}`;
    const _snapshotTable = `${schema ? schema + '.' : ''}${tablePrefix}${snapshotTable}`;
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
        .join('\n');
};
exports.create = create;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL3NjaGVtYS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBTyxNQUFNLE1BQU0sR0FBRyxDQUNwQixXQUFtQixFQUNuQixVQUFVLEdBQUcsZUFBZSxFQUM1QixhQUFhLEdBQUcsZ0JBQWdCLEVBQ2hDLE1BQWUsRUFDZixFQUFFO0lBQ0YsTUFBTSxXQUFXLEdBQUc7a0NBQ1ksTUFBTTtHQUNyQyxDQUFDO0lBRUYsTUFBTSxXQUFXLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxXQUFXLEdBQUcsVUFBVSxFQUFFLENBQUM7SUFDL0UsTUFBTSxjQUFjLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxXQUFXLEdBQUcsYUFBYSxFQUFFLENBQUM7SUFFckYsTUFBTSxlQUFlLEdBQUc7aUNBQ08sV0FBVzs7Ozs7Ozs7bUJBUXpCLFdBQVcsR0FBRyxVQUFVOztHQUV4QyxDQUFDO0lBRUYsTUFBTSxrQkFBa0IsR0FBRztpQ0FDSSxjQUFjOzs7Ozs7OztHQVE1QyxDQUFDO0lBRUYsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixDQUFDO1NBQ3RFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUM7QUF4Q1csUUFBQSxNQUFNLFVBd0NqQiJ9