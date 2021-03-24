const { add, complete, cycle, save, suite } = require("benny");
const { PersistedEvent, PersistedSnapshot } = require("nact/lib/persistence");
const { PostgresPersistenceEngine } = require("nact-persistence-postgres");
const { SQLitePersistenceEngine } = require("../lib");
const { destroy, makeSnapshot } = require("./utils");
const mem = require("mem");

const _snaps = ((size) => {
  const _array = [];
  for (let i = 1; i <= size; i++) {
    _array.push(makeSnapshot(i, "test"));
  }
  return _array;
})(100000);

const snapGenerator = function* () {
  for (const event of _snaps) yield event;
};

const snapSource = () => {
  const gen = snapGenerator();
  return () => gen.next().value;
};

const sqlTakeSnapshot = async () => {
  const dbFilename = "bench-async.sqlite";
  destroy(dbFilename);
  const engine = new SQLitePersistenceEngine(dbFilename, {
    createIfNotExists: true,
  });
  const next = snapSource();
  return async () => engine.takeSnapshot(next());
};

const sqlTakeSnapshotSync = async () => {
  const dbFilename = "bench-sync.sqlite";
  destroy(dbFilename);
  const engine = new SQLitePersistenceEngine(dbFilename, {
    createIfNotExists: true,
  });
  const next = snapSource();
  return () => engine.takeSnapshotSync(next());
};

const sqlTakeSnapshotSyncMemory = async () => {
  const dbFilename = ":memory:";
  const engine = new SQLitePersistenceEngine(dbFilename, {
    createIfNotExists: true,
  });
  const next = snapSource();
  return () => engine.takeSnapshotSync(next());
};

const pgTakeSnapshot = async () => {
  // const connectionString =
  //   "postgres://postgres:testpassword@localhost:5431/testdb";
  const connectionString =
    "postgresql://postgres:secret@localhost:5432/bench-test";
  const engine = new PostgresPersistenceEngine(connectionString);
  await engine.db.then((db) =>
    db.none("TRUNCATE TABLE snapshot_store RESTART IDENTITY;")
  );
  const next = snapSource();
  return async () => engine.takeSnapshot(next());
};

const takeSnapshotSuite = () =>
  suite(
    "PersistenceEngine.takeSnapshot()",
    add("SQLitePersistenceEngine.takeSnapshot()", mem(sqlTakeSnapshot)),
    add("SQLitePersistenceEngine.takeSnapshotSync()", mem(sqlTakeSnapshotSync)),
    add("PostgresPersistenceEngine.takeSnapshot()", mem(pgTakeSnapshot)),
    // For ultimate speed, but kind pointless. Only useful for tests?
    // add(
    //   "SQLitePersistenceEngine.sqlTakeSnapshotSyncMemory()",
    //   mem(sqlTakeSnapshotSyncMemory)
    // ),
    cycle(),
    complete(),
    save({ file: "takeSnapshot", version: "1.0.0" }),
    save({ file: "takeSnapshot", format: "chart.html" })
  );

module.exports = { takeSnapshotSuite };
