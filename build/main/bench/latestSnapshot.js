"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.latestSnapshotSuite = void 0;
const benny_1 = require("benny");
const mem_1 = __importDefault(require("mem"));
const nact_persistence_postgres_1 = require("nact-persistence-postgres");
const src_1 = require("../src");
const utils_1 = require("./utils");
const seedEngineWithSnapshots = async (engine, count, key) => {
    for (let i = 1; i <= count; i++) {
        await engine.takeSnapshot(utils_1.makeSnapshot(i, key));
    }
};
const sqlLatestSnapshots = async () => {
    const dbFilename = 'bench-snaps-async.sqlite';
    utils_1.destroy(dbFilename);
    const engine = new src_1.SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
    });
    await seedEngineWithSnapshots(engine, 100, 'test1');
    return async () => engine.latestSnapshot('test1');
};
const sqlLatestSnapshotsSync = async () => {
    const dbFilename = 'bench-snaps-sync.sqlite';
    utils_1.destroy(dbFilename);
    const engine = new src_1.SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
    });
    await seedEngineWithSnapshots(engine, 100, 'test1');
    return () => engine.latestSnapshotSync('test1');
};
const pgLatestSnapshots = async () => {
    // const connectionString =
    //   "postgres://postgres:testpassword@localhost:5431/testdb";
    const connectionString = 'postgresql://postgres:secret@localhost:5432/bench-test';
    const engine = new nact_persistence_postgres_1.PostgresPersistenceEngine(connectionString);
    await engine.db.then((db) => db.none('TRUNCATE TABLE snapshot_store RESTART IDENTITY;'));
    seedEngineWithSnapshots(engine, 100, 'test1');
    return async () => engine.latestSnapshot('test1');
};
exports.latestSnapshotSuite = () => benny_1.suite('PersistenceEngine.latestSnapshot()', benny_1.add('SQLitePersistenceEngine.latestSnapshot()', mem_1.default(sqlLatestSnapshots)), benny_1.add('SQLitePersistenceEngine.latestSnapshotSync()', mem_1.default(sqlLatestSnapshotsSync)), benny_1.add('PostgresPersistenceEngine.latestSnapshot()', mem_1.default(pgLatestSnapshots)), 
// For ultimate speed, but kind pointless. Only useful for tests?
// add(
//   "SQLitePersistenceEngine.sqlLatestSnapshotsSyncMemory()",
//   mem(sqlLatestSnapshotsSyncMemory)
// ),
benny_1.cycle(), benny_1.complete(), benny_1.save({ file: 'latestSnapshot', version: '1.0.0' }), benny_1.save({ file: 'latestSnapshot', format: 'chart.html' }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF0ZXN0U25hcHNob3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9iZW5jaC9sYXRlc3RTbmFwc2hvdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxpQ0FBMEQ7QUFDMUQsOENBQXNCO0FBQ3RCLHlFQUFzRTtBQUV0RSxnQ0FBaUQ7QUFFakQsbUNBQWdEO0FBRWhELE1BQU0sdUJBQXVCLEdBQUcsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7SUFDM0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUMvQixNQUFNLE1BQU0sQ0FBQyxZQUFZLENBQUMsb0JBQVksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUNqRDtBQUNILENBQUMsQ0FBQztBQUVGLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxJQUFJLEVBQUU7SUFDcEMsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUM7SUFDOUMsZUFBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3BCLE1BQU0sTUFBTSxHQUFHLElBQUksNkJBQXVCLENBQUMsVUFBVSxFQUFFO1FBQ3JELGlCQUFpQixFQUFFLElBQUk7S0FDeEIsQ0FBQyxDQUFDO0lBQ0gsTUFBTSx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3BELE9BQU8sS0FBSyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3BELENBQUMsQ0FBQztBQUVGLE1BQU0sc0JBQXNCLEdBQUcsS0FBSyxJQUFJLEVBQUU7SUFDeEMsTUFBTSxVQUFVLEdBQUcseUJBQXlCLENBQUM7SUFDN0MsZUFBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3BCLE1BQU0sTUFBTSxHQUFHLElBQUksNkJBQXVCLENBQUMsVUFBVSxFQUFFO1FBQ3JELGlCQUFpQixFQUFFLElBQUk7S0FDeEIsQ0FBQyxDQUFDO0lBQ0gsTUFBTSx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3BELE9BQU8sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQztBQUVGLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxJQUFJLEVBQUU7SUFDbkMsMkJBQTJCO0lBQzNCLDhEQUE4RDtJQUM5RCxNQUFNLGdCQUFnQixHQUFHLHdEQUF3RCxDQUFDO0lBQ2xGLE1BQU0sTUFBTSxHQUFHLElBQUkscURBQXlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUMvRCxNQUFNLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGlEQUFpRCxDQUFDLENBQUMsQ0FBQztJQUN6Rix1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzlDLE9BQU8sS0FBSyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3BELENBQUMsQ0FBQztBQUVXLFFBQUEsbUJBQW1CLEdBQUcsR0FBRyxFQUFFLENBQ3RDLGFBQUssQ0FDSCxvQ0FBb0MsRUFDcEMsV0FBRyxDQUFDLDBDQUEwQyxFQUFFLGFBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQ3hFLFdBQUcsQ0FBQyw4Q0FBOEMsRUFBRSxhQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxFQUNoRixXQUFHLENBQUMsNENBQTRDLEVBQUUsYUFBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDekUsaUVBQWlFO0FBQ2pFLE9BQU87QUFDUCw4REFBOEQ7QUFDOUQsc0NBQXNDO0FBQ3RDLEtBQUs7QUFDTCxhQUFLLEVBQUUsRUFDUCxnQkFBUSxFQUFFLEVBQ1YsWUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUNsRCxZQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQ3ZELENBQUMifQ==