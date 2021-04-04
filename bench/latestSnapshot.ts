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

export const latestSnapshotSuite = () =>
  suite(
    'PersistenceEngine.latestSnapshot()',
    add('SQLitePersistenceEngine.latestSnapshot()', mem(sqlLatestSnapshots)),
    add('SQLitePersistenceEngine.latestSnapshotSync()', mem(sqlLatestSnapshotsSync)),
    add('PostgresPersistenceEngine.latestSnapshot()', mem(pgLatestSnapshots)),
    // For ultimate speed, but kind pointless. Only useful for tests?
    // add(
    //   "SQLitePersistenceEngine.sqlLatestSnapshotsSyncMemory()",
    //   mem(sqlLatestSnapshotsSyncMemory)
    // ),
    cycle(),
    complete(),
    save({ file: 'latestSnapshot', version: '1.0.0' }),
    save({ file: 'latestSnapshot', format: 'chart.html' })
  );
