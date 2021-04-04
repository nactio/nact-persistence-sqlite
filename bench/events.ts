import { add, complete, cycle, save, suite } from 'benny';
import mem from 'mem';
// @ts-expect-error Untyped import
import { PostgresPersistenceEngine } from 'nact-persistence-postgres';
// @ts-expect-error Untyped import
import { AbstractPersistenceEngine } from 'nact/lib/persistence';

import { SQLitePersistenceEngine } from '../src';

import { destroy, makeEvent } from './utils';

const seedEngineWithEvents = async (
  engine: AbstractPersistenceEngine,
  count: number,
  key: string
) => {
  for (let i = 1; i <= count; i++) {
    await engine.persist(makeEvent(i, key));
  }
};

const sqlEvents = (dbFilename = 'bench-events-async.sqlite') => async () => {
  destroy(dbFilename);
  const engine = new SQLitePersistenceEngine(dbFilename, {
    createIfNotExists: true,
  });
  await seedEngineWithEvents(engine, 100, 'test1');
  return async () => engine.events('test1');
};

const sqlEventsSync = (dbFilename = 'bench-events-sync.sqlite') => async () => {
  destroy(dbFilename);
  const engine = new SQLitePersistenceEngine(dbFilename, {
    createIfNotExists: true,
  });
  await seedEngineWithEvents(engine, 100, 'test1');
  return () => engine.eventsSync('test1');
};

const pgEvents = (
  connectionString = 'postgresql://postgres:secret@localhost:5432/bench-test'
) => async () => {
  const engine = new PostgresPersistenceEngine(connectionString);
  // @ts-ignore
  await engine.db.then((db) => db.none('TRUNCATE TABLE event_journal RESTART IDENTITY;'));
  seedEngineWithEvents(engine, 100, 'test1');
  // @ts-ignore
  return async () => engine.events('test1');
};

export const eventsSuite = () =>
  suite(
    'PersistenceEngine.events()',
    add('SQLitePersistenceEngine.events()', mem(sqlEvents())),
    add('SQLitePersistenceEngine.eventsSync()', mem(sqlEventsSync())),
    // add('SQLitePersistenceEngine.eventsSync(":memory:")', mem(sqlEventsSync(':memory:'))),
    add('PostgresPersistenceEngine.events()', mem(pgEvents())),
    cycle(),
    complete(),
    save({ file: 'events', version: '1.0.0' }),
    save({ file: 'events', format: 'chart.html' })
  );
