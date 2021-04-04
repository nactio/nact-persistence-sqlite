"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsSuite = void 0;
const benny_1 = require("benny");
const mem_1 = __importDefault(require("mem"));
const nact_persistence_postgres_1 = require("nact-persistence-postgres");
const src_1 = require("../src");
const utils_1 = require("./utils");
const seedEngineWithEvents = async (engine, count, key) => {
    for (let i = 1; i <= count; i++) {
        await engine.persist(utils_1.makeEvent(i, key));
    }
};
const sqlEvents = (dbFilename = 'bench-events-async.sqlite') => async () => {
    utils_1.destroy(dbFilename);
    const engine = new src_1.SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
    });
    await seedEngineWithEvents(engine, 100, 'test1');
    return async () => engine.events('test1');
};
const sqlEventsSync = (dbFilename = 'bench-events-sync.sqlite') => async () => {
    utils_1.destroy(dbFilename);
    const engine = new src_1.SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
    });
    await seedEngineWithEvents(engine, 100, 'test1');
    return () => engine.eventsSync('test1');
};
const pgEvents = (connectionString = 'postgresql://postgres:secret@localhost:5432/bench-test') => async () => {
    const engine = new nact_persistence_postgres_1.PostgresPersistenceEngine(connectionString);
    await engine.db.then((db) => db.none('TRUNCATE TABLE event_journal RESTART IDENTITY;'));
    seedEngineWithEvents(engine, 100, 'test1');
    return async () => engine.events('test1');
};
exports.eventsSuite = () => benny_1.suite('PersistenceEngine.events()', benny_1.add('SQLitePersistenceEngine.events()', mem_1.default(sqlEvents())), benny_1.add('SQLitePersistenceEngine.eventsSync()', mem_1.default(sqlEventsSync())), 
// add('SQLitePersistenceEngine.eventsSync(":memory:")', mem(sqlEventsSync(':memory:'))),
benny_1.add('PostgresPersistenceEngine.events()', mem_1.default(pgEvents())), benny_1.cycle(), benny_1.complete(), benny_1.save({ file: 'events', version: '1.0.0' }), benny_1.save({ file: 'events', format: 'chart.html' }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vYmVuY2gvZXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLGlDQUEwRDtBQUMxRCw4Q0FBc0I7QUFDdEIseUVBQXNFO0FBRXRFLGdDQUFpRDtBQUVqRCxtQ0FBNkM7QUFFN0MsTUFBTSxvQkFBb0IsR0FBRyxLQUFLLEVBQ2hDLE1BQWlDLEVBQ2pDLEtBQWEsRUFDYixHQUFXLEVBQ1gsRUFBRTtJQUNGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDL0IsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLGlCQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDekM7QUFDSCxDQUFDLENBQUM7QUFFRixNQUFNLFNBQVMsR0FBRyxDQUFDLFVBQVUsR0FBRywyQkFBMkIsRUFBRSxFQUFFLENBQUMsS0FBSyxJQUFJLEVBQUU7SUFDekUsZUFBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3BCLE1BQU0sTUFBTSxHQUFHLElBQUksNkJBQXVCLENBQUMsVUFBVSxFQUFFO1FBQ3JELGlCQUFpQixFQUFFLElBQUk7S0FDeEIsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELE9BQU8sS0FBSyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQztBQUVGLE1BQU0sYUFBYSxHQUFHLENBQUMsVUFBVSxHQUFHLDBCQUEwQixFQUFFLEVBQUUsQ0FBQyxLQUFLLElBQUksRUFBRTtJQUM1RSxlQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDcEIsTUFBTSxNQUFNLEdBQUcsSUFBSSw2QkFBdUIsQ0FBQyxVQUFVLEVBQUU7UUFDckQsaUJBQWlCLEVBQUUsSUFBSTtLQUN4QixDQUFDLENBQUM7SUFDSCxNQUFNLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDakQsT0FBTyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQztBQUVGLE1BQU0sUUFBUSxHQUFHLENBQ2YsZ0JBQWdCLEdBQUcsd0RBQXdELEVBQzNFLEVBQUUsQ0FBQyxLQUFLLElBQUksRUFBRTtJQUNkLE1BQU0sTUFBTSxHQUFHLElBQUkscURBQXlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUMvRCxNQUFNLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGdEQUFnRCxDQUFDLENBQUMsQ0FBQztJQUN4RixvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzNDLE9BQU8sS0FBSyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQztBQUVXLFFBQUEsV0FBVyxHQUFHLEdBQUcsRUFBRSxDQUM5QixhQUFLLENBQ0gsNEJBQTRCLEVBQzVCLFdBQUcsQ0FBQyxrQ0FBa0MsRUFBRSxhQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUN6RCxXQUFHLENBQUMsc0NBQXNDLEVBQUUsYUFBRyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7QUFDakUseUZBQXlGO0FBQ3pGLFdBQUcsQ0FBQyxvQ0FBb0MsRUFBRSxhQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUMxRCxhQUFLLEVBQUUsRUFDUCxnQkFBUSxFQUFFLEVBQ1YsWUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFDMUMsWUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FDL0MsQ0FBQyJ9