const { add, complete, cycle, save, suite } = require("benny");
const { PostgresPersistenceEngine } = require("nact-persistence-postgres");
const { SQLitePersistenceEngine } = require("../lib");
const { destroy, makeEvent } = require("./utils");
const mem = require("mem");

const seedEngineWithEvents = async (engine, count, key) => {
  for (let i = 1; i <= count; i++) {
    await engine.persist(makeEvent(i, key));
  }
};

const sqlEvents = async () => {
  const dbFilename = "bench-events-async.sqlite";
  destroy(dbFilename);
  const engine = new SQLitePersistenceEngine(dbFilename, {
    createIfNotExists: true,
  });
  await seedEngineWithEvents(engine, 100, "test1");
  return async () => engine.events("test1");
};

const sqlEventsSync = async () => {
  const dbFilename = "bench-events-sync.sqlite";
  destroy(dbFilename);
  const engine = new SQLitePersistenceEngine(dbFilename, {
    createIfNotExists: true,
  });
  await seedEngineWithEvents(engine, 100, "test1");
  return () => engine.eventsSync("test1");
};

const sqlEventsSyncMemory = async () => {
  const dbFilename = ":memory:";
  const engine = new SQLitePersistenceEngine(dbFilename, {
    createIfNotExists: true,
  });
  await seedEngineWithEvents(engine, 100, "test1");
  return () => engine.eventsSync("test1");
};

const pgEvents = async () => {
  // const connectionString =
  //   "postgres://postgres:testpassword@localhost:5431/testdb";
  const connectionString =
    "postgresql://postgres:secret@localhost:5432/bench-test";
  const engine = new PostgresPersistenceEngine(connectionString);
  await engine.db.then((db) =>
    db.none("TRUNCATE TABLE event_journal RESTART IDENTITY;")
  );
  seedEngineWithEvents(engine, 100, "test1");
  return async () => engine.events("test1");
};

const eventsSuite = () =>
  suite(
    "PersistenceEngine.events()",
    add("SQLitePersistenceEngine.events()", mem(sqlEvents)),
    add("SQLitePersistenceEngine.eventsSync()", mem(sqlEventsSync)),
    add("PostgresPersistenceEngine.events()", mem(pgEvents)),
    // For ultimate speed, but kind pointless. Only useful for tests?
    // add(
    //   "SQLitePersistenceEngine.sqlEventsSyncMemory()",
    //   mem(sqlEventsSyncMemory)
    // ),
    cycle(),
    complete(),
    save({ file: "events", version: "1.0.0" }),
    save({ file: "events", format: "chart.html" })
  );

module.exports = { eventsSuite };
