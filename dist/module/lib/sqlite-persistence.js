import assert from 'assert';
import fs from 'fs';
import Sqlite from 'better-sqlite3';
// @ts-expect-error Untyped import
import { AbstractPersistenceEngine, PersistedEvent, PersistedSnapshot } from 'nact/lib/persistence';
import { create } from './schema';
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
export class SQLitePersistenceEngine extends AbstractPersistenceEngine {
    constructor(filename, { createIfNotExists = true, tablePrefix = '', schema = undefined, eventTable = 'event_journal', snapshotTable = 'snapshot_store', } = {}) {
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
        return new PersistedEvent(JSON.parse(dbEvent.data), 
        // Number.parseInt(dbEvent.sequence_nr),
        dbEvent.sequence_nr, dbEvent.persistence_key, JSON.parse(dbEvent.tags), 
        // Number.parseInt(dbEvent.created_at),
        dbEvent.created_at, !!dbEvent.is_deleted);
    }
    static mapDbModelToSnapshotDomainModel(dbSnapshot) {
        if (dbSnapshot) {
            return new PersistedSnapshot(JSON.parse(dbSnapshot.data), 
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
        assert(typeof persistenceKey === 'string');
        assert(Number.isInteger(offset));
        assert(Number.isInteger(limit));
        assert(tags === undefined ||
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
            return events?.filter(hasAllTags);
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
        const { lastInsertRowid } = this.insertEvent.run({
            ...persistedEvent,
            data: JSON.stringify(persistedEvent.data),
            tags: JSON.stringify(persistedEvent.tags),
        });
        return lastInsertRowid;
    }
    async latestSnapshot(persistenceKey) {
        return new Result(this.latestSnapshotSync(persistenceKey));
    }
    latestSnapshotSync(persistenceKey) {
        assert(typeof persistenceKey === 'string');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsaXRlLXBlcnNpc3RlbmNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9zcWxpdGUtcGVyc2lzdGVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQztBQUVwQixPQUFPLE1BQU0sTUFBTSxnQkFBZ0IsQ0FBQztBQUNwQyxrQ0FBa0M7QUFDbEMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRXBHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFbEMsTUFBTSxNQUFNO0lBR1YsWUFBWSxNQUFlO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQsSUFBSSxDQUFDLEVBQXNEO1FBQ3pELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU0sQ0FBSSxFQUFpQztRQUN6Qyx1RUFBdUU7UUFDdkUsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7Q0FDRjtBQWtCRCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEseUJBQXlCO0lBY3BFLFlBQ0UsUUFBZ0IsRUFDaEIsRUFDRSxpQkFBaUIsR0FBRyxJQUFJLEVBQ3hCLFdBQVcsR0FBRyxFQUFFLEVBQ2hCLE1BQU0sR0FBRyxTQUFTLEVBQ2xCLFVBQVUsR0FBRyxlQUFlLEVBQzVCLGFBQWEsR0FBRyxnQkFBZ0IsR0FDakMsR0FBRyxFQUFFO1FBRU4sS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztRQUNuQyxJQUFJLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUM5QixJQUFJO2dCQUNGLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDdkI7WUFBQyxPQUFPLEdBQUcsRUFBRTtnQkFDWixPQUFPO2FBQ1I7WUFDRCwwREFBMEQ7WUFDMUQsa0RBQWtEO1lBQ2xELCtDQUErQztZQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUM3QyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQjtRQUNoRCxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQsS0FBSztRQUNILFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNsQixDQUFDO0lBRUQsTUFBTSxDQUFDLHVCQUF1QixDQUFDLE9BQWdCO1FBQzdDLE9BQU8sSUFBSSxjQUFjLENBQ3ZCLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUN4Qix3Q0FBd0M7UUFDeEMsT0FBTyxDQUFDLFdBQVcsRUFDbkIsT0FBTyxDQUFDLGVBQWUsRUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQ3hCLHVDQUF1QztRQUN2QyxPQUFPLENBQUMsVUFBVSxFQUNsQixDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FDckIsQ0FBQztJQUNKLENBQUM7SUFFRCxNQUFNLENBQUMsK0JBQStCLENBQUMsVUFBc0I7UUFDM0QsSUFBSSxVQUFVLEVBQUU7WUFDZCxPQUFPLElBQUksaUJBQWlCLENBQzFCLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUMzQiwyQ0FBMkM7WUFDM0MsVUFBVSxDQUFDLFdBQVcsRUFDdEIsVUFBVSxDQUFDLGVBQWU7WUFDMUIseUNBQXlDO1lBQ3pDLFVBQVUsQ0FBQyxVQUFVLENBQ3RCLENBQUM7U0FDSDtRQUNELE9BQU87SUFDVCxDQUFDO0lBRUQsaUJBQWlCO1FBQ2YsTUFBTSxXQUFXLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQzVFLElBQUksQ0FBQyxVQUNQLEVBQUUsQ0FBQztRQUNILE1BQU0sY0FBYyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxHQUMvRSxJQUFJLENBQUMsYUFDUCxFQUFFLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRztzQkFDSCxXQUFXOzs7O2NBSW5CLENBQUM7UUFDWCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRWxELE1BQU0sV0FBVyxHQUFHO29CQUNKLFdBQVc7Ozs7OztrRUFNbUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRWhELE1BQU0sb0JBQW9CLEdBQUc7c0JBQ1gsY0FBYzs7OztlQUlyQixDQUFDO1FBQ1osSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFbEUsTUFBTSxjQUFjLEdBQUc7b0JBQ1AsY0FBYzs7Ozs7O3lEQU11QixDQUFDO1FBQ3RELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxjQUFzQixFQUFFLE1BQU0sR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLE9BQU8sRUFBRSxJQUF3QjtRQUNsRixPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQsVUFBVSxDQUFDLGNBQXNCLEVBQUUsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsT0FBTyxFQUFFLElBQXdCO1FBQ3RGLE1BQU0sQ0FBQyxPQUFPLGNBQWMsS0FBSyxRQUFRLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUNKLElBQUksS0FBSyxTQUFTO1lBQ2hCLENBQUMsSUFBSSxZQUFZLEtBQUs7Z0JBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxRQUFRLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQ2pGLENBQUM7UUFFRixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7U0FDbkQ7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWTthQUM3QixHQUFHLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUM7YUFDbEMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFFeEQsb0VBQW9FO1FBQ3BFLGtFQUFrRTtRQUNsRSwwRUFBMEU7UUFDMUUsNkJBQTZCO1FBQzdCLEVBQUU7UUFDRiw4REFBOEQ7UUFDOUQsRUFBRTtRQUNGLHlFQUF5RTtRQUN6RSw0QkFBNEI7UUFFNUIsSUFBSSxJQUFJLEVBQUU7WUFDUixNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQXFCLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFNUYsT0FBTyxNQUFNLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ25DO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBOEI7UUFDMUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELFdBQVcsQ0FBQyxjQUE4QjtRQUN4QyxJQUFJLGNBQWMsS0FBSyxTQUFTO1lBQUUsT0FBTztRQUV6QyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7U0FDbkQ7UUFFRCxNQUFNLEVBQUUsZUFBZSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUM7WUFDL0MsR0FBRyxjQUFjO1lBQ2pCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDekMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQztTQUMxQyxDQUFDLENBQUM7UUFFSCxPQUFPLGVBQWUsQ0FBQztJQUN6QixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxjQUFzQjtRQUN6QyxPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxjQUFzQjtRQUN2QyxNQUFNLENBQUMsT0FBTyxjQUFjLEtBQUssUUFBUSxDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtZQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7U0FDbkQ7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRTNELE9BQU8sdUJBQXVCLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsaUJBQW9DO1FBQ3JELE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsaUJBQW9DO1FBQ25ELE1BQU0sQ0FBQyxPQUFPLGlCQUFpQixDQUFDLEdBQUcsS0FBSyxRQUFRLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBRTNELElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztTQUNuRDtRQUVELE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQztZQUNsRCxHQUFHLGlCQUFpQjtZQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7U0FDN0MsQ0FBQyxDQUFDO1FBRUgsT0FBTyxlQUFlLENBQUM7SUFDekIsQ0FBQztDQUNGIn0=