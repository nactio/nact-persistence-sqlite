export const create = (tablePrefix, eventTable = 'event_journal', snapshotTable = 'snapshot_store', schema) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL3NjaGVtYS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcsQ0FDcEIsV0FBbUIsRUFDbkIsVUFBVSxHQUFHLGVBQWUsRUFDNUIsYUFBYSxHQUFHLGdCQUFnQixFQUNoQyxNQUFlLEVBQ2YsRUFBRTtJQUNGLE1BQU0sV0FBVyxHQUFHO2tDQUNZLE1BQU07R0FDckMsQ0FBQztJQUVGLE1BQU0sV0FBVyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsV0FBVyxHQUFHLFVBQVUsRUFBRSxDQUFDO0lBQy9FLE1BQU0sY0FBYyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsV0FBVyxHQUFHLGFBQWEsRUFBRSxDQUFDO0lBRXJGLE1BQU0sZUFBZSxHQUFHO2lDQUNPLFdBQVc7Ozs7Ozs7O21CQVF6QixXQUFXLEdBQUcsVUFBVTs7R0FFeEMsQ0FBQztJQUVGLE1BQU0sa0JBQWtCLEdBQUc7aUNBQ0ksY0FBYzs7Ozs7Ozs7R0FRNUMsQ0FBQztJQUVGLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxrQkFBa0IsQ0FBQztTQUN0RSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDIn0=