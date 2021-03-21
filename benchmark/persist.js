const { add, complete, cycle, save, suite } = require("benny");
const { PersistedEvent, PersistedSnapshot } = require("nact/lib/persistence");
const { PostgresPersistenceEngine } = require("nact-persistence-postgres");
const { SQLitePersistenceEngine } = require("../lib");
const { destroy, makeEvent } = require("./utils");
const mem = require("mem");

const _events = ((size) => {
  const _array = [];
  for (let i = 1; i <= size; i++) {
    _array.push(makeEvent(i, "test"));
  }
  return _array;
})(100000);

const eventGenerator = function* () {
  for (const event of _events) yield event;
};

const eventSource = () => {
  const gen = eventGenerator();
  return () => gen.next().value;
};

const sqlPersist = async () => {
  const dbFilename = "bench-async.sqlite";
  destroy(dbFilename);
  const engine = new SQLitePersistenceEngine(dbFilename, {
    createIfNotExists: true,
  });
  const next = eventSource();
  return async () => engine.persist(next());
};

const sqlPersistSync = async () => {
  const dbFilename = "bench-sync.sqlite";
  destroy(dbFilename);
  const engine = new SQLitePersistenceEngine(dbFilename, {
    createIfNotExists: true,
  });
  const next = eventSource();
  return () => engine.persistSync(next());
};

const pgPersist = async () => {
  // const connectionString =
  //   "postgres://postgres:testpassword@localhost:5431/testdb";
  const connectionString =
    "postgresql://postgres:secret@localhost:5432/bench-test";
  const engine = new PostgresPersistenceEngine(connectionString);
  const next = eventSource();
  return async () => engine.persist(next());
};

const persistSuite = () =>
  suite(
    "Nact PersistenceEngine.persist()",
    add("SQLitePersistenceEngine.persist()", mem(sqlPersist)),
    add("SQLitePersistenceEngine.persistSync()", mem(sqlPersistSync)),
    add("PostgresPersistenceEngine.persist()", mem(pgPersist)),
    cycle(),
    complete(),
    save({ file: "persist", version: "1.0.0" }),
    save({ file: "persist", format: "chart.html" })
  );

exports.persistSuite = persistSuite;
