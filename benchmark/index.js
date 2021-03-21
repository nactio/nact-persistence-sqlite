const { add, complete, cycle, save, suite } = require("benny");
const { PersistedEvent, PersistedSnapshot } = require("nact/lib/persistence");
const { SQLitePersistenceEngine } = require("../lib");
const { PostgresPersistenceEngine } = require("nact-persistence-postgres");
// const Database = require("better-sqlite3");
const fs = require("fs");
const mem = require("mem");

const delay = (time) =>
  new Promise((resolve, reject) => {
    setTimeout(() => resolve(), time);
  });

const destroy = (dbFilename) => {
  if (fs.existsSync(dbFilename)) fs.unlinkSync(dbFilename);
};

const makeEvent = (i, key) =>
  new PersistedEvent(
    {
      type: "TEST_EVENT",
      data: {
        num: i + 1234567890123456,
        text: `${i + 1234567890123456}`,
      },
    },
    i,
    key
  );

const _events = ((size) => {
  const _array = [];
  for (let i = 1; i <= size; i++) {
    _array.push(makeEvent(i, "test"));
  }
  return _array;
})(100000);

const seedEngineWithEvents = async (engine, count, key) => {
  for (let i = 1; i <= count; i++) {
    await engine.persist(makeEvent(i, key));
  }
};

const eventGenerator = function* () {
  for (const event of _events) yield event;
};

const eventSource = () => {
  const gen = eventGenerator();
  return () => gen.next().value;
};

const persistSuite = () =>
  suite(
    "Nact PersistenceEngine.persist()",

    add("SQLitePersistenceEngine.persist()", async () => {
      const dbFilename = "bench-async.sqlite";
      destroy(dbFilename);
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      const next = eventSource();
      return async () => engine.persist(next());
    }),

    add("SQLitePersistenceEngine.persistSync()", () => {
      const dbFilename = "bench-sync.sqlite";
      destroy(dbFilename);
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      const next = eventSource();
      return () => engine.persistSync(next());
    }),

    add("PostgresPersistenceEngine.persist()", async () => {
      // const connectionString =
      //   "postgres://postgres:testpassword@localhost:5431/testdb";
      const connectionString =
        "postgresql://postgres:secret@localhost:5432/bench-test";
      const engine = new PostgresPersistenceEngine(connectionString);
      const next = eventSource();
      return async () => engine.persist(next());
    }),

    cycle(),
    complete(),
    save({ file: "persist", version: "1.0.0" }),
    save({ file: "persist", format: "chart.html" })
  );

const eventsSuite = () =>
  suite(
    "PersistenceEngine.events()",

    add("SQLitePersistenceEngine.events()", async () => {
      const dbFilename = "bench-events-async.sqlite";
      destroy(dbFilename);
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      await seedEngineWithEvents(engine, 100, "test1");
      return async () => engine.events("test1");
    }),

    add("SQLitePersistenceEngine.eventsSync()", async () => {
      const dbFilename = "bench-events-sync.sqlite";
      destroy(dbFilename);
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      await seedEngineWithEvents(engine, 100, "test1");
      return () => engine.eventsSync("test1");
    }),

    add("PostgresPersistenceEngine.events()", async () => {
      // const connectionString =
      //   "postgres://postgres:testpassword@localhost:5431/testdb";
      const connectionString =
        "postgresql://postgres:secret@localhost:5432/bench-test";
      const engine = new PostgresPersistenceEngine(connectionString);
      seedEngineWithEvents(engine, 100, "test1");
      return async () => engine.events("test1");
    }),

    cycle(),
    complete(),
    save({ file: "events", version: "1.0.0" }),
    save({ file: "events", format: "chart.html" })
  );

const main = async () => {
  await persistSuite();
  await eventsSuite();
};

main();
