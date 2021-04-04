"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.takeSnapshotSuite = void 0;
const benny_1 = require("benny");
const mem_1 = __importDefault(require("mem"));
const nact_persistence_postgres_1 = require("nact-persistence-postgres");
const src_1 = require("../src");
const utils_1 = require("./utils");
const _snaps = ((size) => {
    const _array = [];
    for (let i = 1; i <= size; i++) {
        _array.push(utils_1.makeSnapshot(i, 'test'));
    }
    return _array;
})(100000);
const snapGenerator = function* () {
    for (const event of _snaps)
        yield event;
};
const snapSource = () => {
    const gen = snapGenerator();
    return () => gen.next().value;
};
const sqlTakeSnapshot = async () => {
    const dbFilename = 'bench-async.sqlite';
    utils_1.destroy(dbFilename);
    const engine = new src_1.SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
    });
    const next = snapSource();
    return async () => engine.takeSnapshot(next());
};
const sqlTakeSnapshotSync = async () => {
    const dbFilename = 'bench-sync.sqlite';
    utils_1.destroy(dbFilename);
    const engine = new src_1.SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
    });
    const next = snapSource();
    return () => engine.takeSnapshotSync(next());
};
const pgTakeSnapshot = async () => {
    const connectionString = 'postgresql://postgres:secret@localhost:5432/bench-test';
    const engine = new nact_persistence_postgres_1.PostgresPersistenceEngine(connectionString);
    await engine.db.then((db) => db.none('TRUNCATE TABLE snapshot_store RESTART IDENTITY;'));
    const next = snapSource();
    return async () => engine.takeSnapshot(next());
};
exports.takeSnapshotSuite = () => benny_1.suite('PersistenceEngine.takeSnapshot()', benny_1.add('SQLitePersistenceEngine.takeSnapshot()', mem_1.default(sqlTakeSnapshot)), benny_1.add('SQLitePersistenceEngine.takeSnapshotSync()', mem_1.default(sqlTakeSnapshotSync)), benny_1.add('PostgresPersistenceEngine.takeSnapshot()', mem_1.default(pgTakeSnapshot)), 
// For ultimate speed, but kind pointless. Only useful for tests?
// add(
//   "SQLitePersistenceEngine.sqlTakeSnapshotSyncMemory()",
//   mem(sqlTakeSnapshotSyncMemory)
// ),
benny_1.cycle(), benny_1.complete(), benny_1.save({ file: 'takeSnapshot', version: '1.0.0' }), benny_1.save({ file: 'takeSnapshot', format: 'chart.html' }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFrZVNuYXBzaG90LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vYmVuY2gvdGFrZVNuYXBzaG90LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGlDQUEwRDtBQUMxRCw4Q0FBc0I7QUFDdEIseUVBQXNFO0FBRXRFLGdDQUFpRDtBQUVqRCxtQ0FBZ0Q7QUFFaEQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO0lBQ3ZCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNsQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQVksQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztLQUN0QztJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRVgsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDO0lBQzdCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTTtRQUFFLE1BQU0sS0FBSyxDQUFDO0FBQzFDLENBQUMsQ0FBQztBQUVGLE1BQU0sVUFBVSxHQUFHLEdBQUcsRUFBRTtJQUN0QixNQUFNLEdBQUcsR0FBRyxhQUFhLEVBQUUsQ0FBQztJQUM1QixPQUFPLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUM7QUFDaEMsQ0FBQyxDQUFDO0FBRUYsTUFBTSxlQUFlLEdBQUcsS0FBSyxJQUFJLEVBQUU7SUFDakMsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUM7SUFDeEMsZUFBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3BCLE1BQU0sTUFBTSxHQUFHLElBQUksNkJBQXVCLENBQUMsVUFBVSxFQUFFO1FBQ3JELGlCQUFpQixFQUFFLElBQUk7S0FDeEIsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxJQUFJLEdBQUcsVUFBVSxFQUFFLENBQUM7SUFDMUIsT0FBTyxLQUFLLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUM7QUFFRixNQUFNLG1CQUFtQixHQUFHLEtBQUssSUFBSSxFQUFFO0lBQ3JDLE1BQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFDO0lBQ3ZDLGVBQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNwQixNQUFNLE1BQU0sR0FBRyxJQUFJLDZCQUF1QixDQUFDLFVBQVUsRUFBRTtRQUNyRCxpQkFBaUIsRUFBRSxJQUFJO0tBQ3hCLENBQUMsQ0FBQztJQUNILE1BQU0sSUFBSSxHQUFHLFVBQVUsRUFBRSxDQUFDO0lBQzFCLE9BQU8sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDO0FBRUYsTUFBTSxjQUFjLEdBQUcsS0FBSyxJQUFJLEVBQUU7SUFDaEMsTUFBTSxnQkFBZ0IsR0FBRyx3REFBd0QsQ0FBQztJQUNsRixNQUFNLE1BQU0sR0FBRyxJQUFJLHFEQUF5QixDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDL0QsTUFBTSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpREFBaUQsQ0FBQyxDQUFDLENBQUM7SUFDekYsTUFBTSxJQUFJLEdBQUcsVUFBVSxFQUFFLENBQUM7SUFDMUIsT0FBTyxLQUFLLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUM7QUFFVyxRQUFBLGlCQUFpQixHQUFHLEdBQUcsRUFBRSxDQUNwQyxhQUFLLENBQ0gsa0NBQWtDLEVBQ2xDLFdBQUcsQ0FBQyx3Q0FBd0MsRUFBRSxhQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsRUFDbkUsV0FBRyxDQUFDLDRDQUE0QyxFQUFFLGFBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQzNFLFdBQUcsQ0FBQywwQ0FBMEMsRUFBRSxhQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDcEUsaUVBQWlFO0FBQ2pFLE9BQU87QUFDUCwyREFBMkQ7QUFDM0QsbUNBQW1DO0FBQ25DLEtBQUs7QUFDTCxhQUFLLEVBQUUsRUFDUCxnQkFBUSxFQUFFLEVBQ1YsWUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFDaEQsWUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FDckQsQ0FBQyJ9