import { add, complete, cycle, save, suite } from 'benny';
import mem from 'mem';
import { PostgresPersistenceEngine } from 'nact-persistence-postgres';
import { SQLitePersistenceEngine } from '../src';
import { destroy, makeSnapshot } from './utils';
const seedEngineWithSnapshots = async (engine, count, key) => {
    for (let i = 1; i <= count; i++) {
        await engine.takeSnapshot(makeSnapshot(i, key));
    }
};
const sqlLatestSnapshots = async () => {
    const dbFilename = 'bench-snaps-async.sqlite';
    destroy(dbFilename);
    const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
    });
    await seedEngineWithSnapshots(engine, 100, 'test1');
    return async () => engine.latestSnapshot('test1');
};
const sqlLatestSnapshotsSync = async () => {
    const dbFilename = 'bench-snaps-sync.sqlite';
    destroy(dbFilename);
    const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
    });
    await seedEngineWithSnapshots(engine, 100, 'test1');
    return () => engine.latestSnapshotSync('test1');
};
const pgLatestSnapshots = async () => {
    // const connectionString =
    //   "postgres://postgres:testpassword@localhost:5431/testdb";
    const connectionString = 'postgresql://postgres:secret@localhost:5432/bench-test';
    const engine = new PostgresPersistenceEngine(connectionString);
    await engine.db.then((db) => db.none('TRUNCATE TABLE snapshot_store RESTART IDENTITY;'));
    seedEngineWithSnapshots(engine, 100, 'test1');
    return async () => engine.latestSnapshot('test1');
};
export const latestSnapshotSuite = () => suite('PersistenceEngine.latestSnapshot()', add('SQLitePersistenceEngine.latestSnapshot()', mem(sqlLatestSnapshots)), add('SQLitePersistenceEngine.latestSnapshotSync()', mem(sqlLatestSnapshotsSync)), add('PostgresPersistenceEngine.latestSnapshot()', mem(pgLatestSnapshots)), 
// For ultimate speed, but kind pointless. Only useful for tests?
// add(
//   "SQLitePersistenceEngine.sqlLatestSnapshotsSyncMemory()",
//   mem(sqlLatestSnapshotsSyncMemory)
// ),
cycle(), complete(), save({ file: 'latestSnapshot', version: '1.0.0' }), save({ file: 'latestSnapshot', format: 'chart.html' }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF0ZXN0U25hcHNob3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9iZW5jaC9sYXRlc3RTbmFwc2hvdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUMxRCxPQUFPLEdBQUcsTUFBTSxLQUFLLENBQUM7QUFDdEIsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sUUFBUSxDQUFDO0FBRWpELE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRWhELE1BQU0sdUJBQXVCLEdBQUcsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7SUFDM0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUMvQixNQUFNLE1BQU0sQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ2pEO0FBQ0gsQ0FBQyxDQUFDO0FBRUYsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLElBQUksRUFBRTtJQUNwQyxNQUFNLFVBQVUsR0FBRywwQkFBMEIsQ0FBQztJQUM5QyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDcEIsTUFBTSxNQUFNLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQyxVQUFVLEVBQUU7UUFDckQsaUJBQWlCLEVBQUUsSUFBSTtLQUN4QixDQUFDLENBQUM7SUFDSCxNQUFNLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEQsT0FBTyxLQUFLLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDcEQsQ0FBQyxDQUFDO0FBRUYsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLElBQUksRUFBRTtJQUN4QyxNQUFNLFVBQVUsR0FBRyx5QkFBeUIsQ0FBQztJQUM3QyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDcEIsTUFBTSxNQUFNLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQyxVQUFVLEVBQUU7UUFDckQsaUJBQWlCLEVBQUUsSUFBSTtLQUN4QixDQUFDLENBQUM7SUFDSCxNQUFNLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEQsT0FBTyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDO0FBRUYsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLElBQUksRUFBRTtJQUNuQywyQkFBMkI7SUFDM0IsOERBQThEO0lBQzlELE1BQU0sZ0JBQWdCLEdBQUcsd0RBQXdELENBQUM7SUFDbEYsTUFBTSxNQUFNLEdBQUcsSUFBSSx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsaURBQWlELENBQUMsQ0FBQyxDQUFDO0lBQ3pGLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDOUMsT0FBTyxLQUFLLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDcEQsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxFQUFFLENBQ3RDLEtBQUssQ0FDSCxvQ0FBb0MsRUFDcEMsR0FBRyxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQ3hFLEdBQUcsQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxFQUNoRixHQUFHLENBQUMsNENBQTRDLEVBQUUsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDekUsaUVBQWlFO0FBQ2pFLE9BQU87QUFDUCw4REFBOEQ7QUFDOUQsc0NBQXNDO0FBQ3RDLEtBQUs7QUFDTCxLQUFLLEVBQUUsRUFDUCxRQUFRLEVBQUUsRUFDVixJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQ2xELElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FDdkQsQ0FBQyJ9