"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistSuite = void 0;
const benny_1 = require("benny");
const mem_1 = __importDefault(require("mem"));
const nact_persistence_postgres_1 = require("nact-persistence-postgres");
const src_1 = require("../src");
const utils_1 = require("./utils");
const _events = ((size) => {
    const _array = [];
    for (let i = 1; i <= size; i++) {
        _array.push(utils_1.makeEvent(i, 'test'));
    }
    return _array;
})(100000);
const eventGenerator = function* () {
    for (const event of _events)
        yield event;
};
const eventSource = () => {
    const gen = eventGenerator();
    return () => gen.next().value;
};
const sqlPersist = async () => {
    const dbFilename = 'bench-async.sqlite';
    utils_1.destroy(dbFilename);
    const engine = new src_1.SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
    });
    const next = eventSource();
    return async () => engine.persist(next());
};
const sqlPersistSync = async () => {
    const dbFilename = 'bench-sync.sqlite';
    utils_1.destroy(dbFilename);
    const engine = new src_1.SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
    });
    const next = eventSource();
    return () => engine.persistSync(next());
};
const pgPersist = async () => {
    // const connectionString =
    //   "postgres://postgres:testpassword@localhost:5431/testdb";
    const connectionString = 'postgresql://postgres:secret@localhost:5432/bench-test';
    const engine = new nact_persistence_postgres_1.PostgresPersistenceEngine(connectionString);
    await engine.db.then((db) => db.none('TRUNCATE TABLE event_journal RESTART IDENTITY;'));
    const next = eventSource();
    return async () => engine.persist(next());
};
exports.persistSuite = () => benny_1.suite('PersistenceEngine.persist()', benny_1.add('SQLitePersistenceEngine.persist()', mem_1.default(sqlPersist)), benny_1.add('SQLitePersistenceEngine.persistSync()', mem_1.default(sqlPersistSync)), benny_1.add('PostgresPersistenceEngine.persist()', mem_1.default(pgPersist)), 
// For ultimate speed, but kind pointless. Only useful for tests?
// add(
//   "SQLitePersistenceEngine.sqlPersistSyncMemory()",
//   mem(sqlPersistSyncMemory)
// ),
benny_1.cycle(), benny_1.complete(), benny_1.save({ file: 'persist', version: '1.0.0' }), benny_1.save({ file: 'persist', format: 'chart.html' }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyc2lzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2JlbmNoL3BlcnNpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsaUNBQTBEO0FBQzFELDhDQUFzQjtBQUN0Qix5RUFBc0U7QUFFdEUsZ0NBQWlEO0FBRWpELG1DQUE2QztBQUU3QyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7SUFDeEIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBUyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0tBQ25DO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFWCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUM7SUFDOUIsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPO1FBQUUsTUFBTSxLQUFLLENBQUM7QUFDM0MsQ0FBQyxDQUFDO0FBRUYsTUFBTSxXQUFXLEdBQUcsR0FBRyxFQUFFO0lBQ3ZCLE1BQU0sR0FBRyxHQUFHLGNBQWMsRUFBRSxDQUFDO0lBQzdCLE9BQU8sR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztBQUNoQyxDQUFDLENBQUM7QUFFRixNQUFNLFVBQVUsR0FBRyxLQUFLLElBQUksRUFBRTtJQUM1QixNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQztJQUN4QyxlQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDcEIsTUFBTSxNQUFNLEdBQUcsSUFBSSw2QkFBdUIsQ0FBQyxVQUFVLEVBQUU7UUFDckQsaUJBQWlCLEVBQUUsSUFBSTtLQUN4QixDQUFDLENBQUM7SUFDSCxNQUFNLElBQUksR0FBRyxXQUFXLEVBQUUsQ0FBQztJQUMzQixPQUFPLEtBQUssSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQztBQUVGLE1BQU0sY0FBYyxHQUFHLEtBQUssSUFBSSxFQUFFO0lBQ2hDLE1BQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFDO0lBQ3ZDLGVBQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNwQixNQUFNLE1BQU0sR0FBRyxJQUFJLDZCQUF1QixDQUFDLFVBQVUsRUFBRTtRQUNyRCxpQkFBaUIsRUFBRSxJQUFJO0tBQ3hCLENBQUMsQ0FBQztJQUNILE1BQU0sSUFBSSxHQUFHLFdBQVcsRUFBRSxDQUFDO0lBQzNCLE9BQU8sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQztBQUVGLE1BQU0sU0FBUyxHQUFHLEtBQUssSUFBSSxFQUFFO0lBQzNCLDJCQUEyQjtJQUMzQiw4REFBOEQ7SUFDOUQsTUFBTSxnQkFBZ0IsR0FBRyx3REFBd0QsQ0FBQztJQUNsRixNQUFNLE1BQU0sR0FBRyxJQUFJLHFEQUF5QixDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDL0QsTUFBTSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDLENBQUM7SUFDeEYsTUFBTSxJQUFJLEdBQUcsV0FBVyxFQUFFLENBQUM7SUFDM0IsT0FBTyxLQUFLLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUM7QUFFVyxRQUFBLFlBQVksR0FBRyxHQUFHLEVBQUUsQ0FDL0IsYUFBSyxDQUNILDZCQUE2QixFQUM3QixXQUFHLENBQUMsbUNBQW1DLEVBQUUsYUFBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQ3pELFdBQUcsQ0FBQyx1Q0FBdUMsRUFBRSxhQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsRUFDakUsV0FBRyxDQUFDLHFDQUFxQyxFQUFFLGFBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUMxRCxpRUFBaUU7QUFDakUsT0FBTztBQUNQLHNEQUFzRDtBQUN0RCw4QkFBOEI7QUFDOUIsS0FBSztBQUNMLGFBQUssRUFBRSxFQUNQLGdCQUFRLEVBQUUsRUFDVixZQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUMzQyxZQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUNoRCxDQUFDIn0=