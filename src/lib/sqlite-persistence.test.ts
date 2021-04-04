/* eslint-env jest */

import fs from 'fs';

import { PersistedEvent, PersistedSnapshot } from '@nact/persistence';

import { SQLitePersistenceEngine } from './sqlite-persistence';

// const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const dbFilename = 'test-sqlite-persistence.sqlite';

const destroy = () => {
  if (fs.existsSync(dbFilename)) fs.unlinkSync(dbFilename);
};

describe('SQLitePersistenceEngine', function () {
  describe('existing connection', () => {
    beforeEach(destroy);

    it('should store values in database', function () {
      const date = new Date().getTime();
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      const snapshot1 = new PersistedSnapshot({ message: 'hello' }, 1, 'test', date);
      const snapshot2 = new PersistedSnapshot({ message: 'goodbye' }, 2, 'test', date);
      const snapshot3 = new PersistedSnapshot({ message: 'hello' }, 1, 'test2', date);
      engine.takeSnapshot(snapshot1);
      engine.takeSnapshot(snapshot2);
      engine.takeSnapshot(snapshot3);

      const result = engine.db
        .prepare("SELECT * FROM snapshot_store WHERE persistence_key = 'test' ORDER BY sequence_nr")
        .all()
        .map(SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
      expect(result).toHaveLength(2);
      expect(result).toEqual([snapshot1, snapshot2]);

      const result2 = engine.db
        .prepare("SELECT * FROM snapshot_store WHERE persistence_key = 'test2'")
        .all()
        .map(SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
      expect(result2).toHaveLength(1);
      expect(result2).toEqual([snapshot3]);
    });
  });

  describe('#persist', function () {
    beforeEach(destroy);

    const date = new Date().getTime();
    it('should store values in database', async function () {
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });

      const event1 = new PersistedEvent({ message: 'hello' }, 1, 'test', ['a', 'b', 'c'], date);
      const event2 = new PersistedEvent(['message', 'goodbye'], 2, 'test', undefined, date);
      const event3 = new PersistedEvent({ message: 'hello' }, 1, 'test2', undefined, date);
      engine.persist(event1);
      engine.persist(event2);
      engine.persist(event3);

      const result = engine.db
        .prepare("SELECT * FROM event_journal WHERE persistence_key = 'test' ORDER BY sequence_nr")
        .all()
        .map(SQLitePersistenceEngine.mapDbModelToDomainModel);

      expect(result).toHaveLength(2);
      expect(result).toEqual([event1, event2]);

      const result2 = engine.db
        .prepare("SELECT * FROM event_journal WHERE persistence_key = 'test2'")
        .all()
        .map(SQLitePersistenceEngine.mapDbModelToDomainModel);
      expect(result2).toHaveLength(1);
      expect(result2).toEqual([event3]);
    });
  });

  describe('#takeSnapshot', function () {
    beforeEach(destroy);

    const date = new Date().getTime();
    it('should store values in database', async () => {
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      const snapshot1 = new PersistedSnapshot({ message: 'hello' }, 1, 'test', date);
      const snapshot2 = new PersistedSnapshot({ message: 'goodbye' }, 2, 'test', date);
      const snapshot3 = new PersistedSnapshot({ message: 'hello' }, 1, 'test2', date);
      engine.takeSnapshot(snapshot1);
      engine.takeSnapshot(snapshot2);
      engine.takeSnapshot(snapshot3);

      const result = engine.db
        .prepare("SELECT * FROM snapshot_store WHERE persistence_key = 'test' ORDER BY sequence_nr")
        .all()
        .map(SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
      expect(result).toHaveLength(2);
      expect(result).toEqual([snapshot1, snapshot2]);

      const result2 = engine.db
        .prepare("SELECT * FROM snapshot_store WHERE persistence_key = 'test2'")
        .all()
        .map(SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
      expect(result2).toHaveLength(1);
      expect(result2).toEqual([snapshot3]);
    });

    it('should store arrays in database', function () {
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      const snapshot1 = new PersistedSnapshot(['hello'], 1, 'test3', date);
      const snapshot2 = new PersistedSnapshot(['goodbye'], 2, 'test3', date);
      const snapshot3 = new PersistedSnapshot(['hello'], 1, 'test4', date);
      engine.takeSnapshot(snapshot1);
      engine.takeSnapshot(snapshot2);
      engine.takeSnapshot(snapshot3);

      const result = engine.db
        .prepare(
          "SELECT * FROM snapshot_store WHERE persistence_key = 'test3' ORDER BY sequence_nr"
        )
        .all()
        .map(SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
      expect(result).toHaveLength(2);
      expect(result).toEqual([snapshot1, snapshot2]);

      const result2 = engine.db
        .prepare("SELECT * FROM snapshot_store WHERE persistence_key = 'test4'")
        .all()
        .map(SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
      expect(result2).toHaveLength(1);
      expect(result2).toEqual([snapshot3]);
    });
  });

  describe('#latestSnapshot', function () {
    const date = new Date().getTime();
    const snapshot1 = new PersistedSnapshot({ message: 'hello' }, 1, 'test3', date);
    const snapshot2 = new PersistedSnapshot({ message: 'goodbye' }, 2, 'test3', date);
    const snapshot3 = new PersistedSnapshot({ message: 'hello again' }, 3, 'test3', date);

    let engine: SQLitePersistenceEngine;
    beforeEach(() => {
      destroy();
      engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      engine.takeSnapshot(snapshot1);
      engine.takeSnapshot(snapshot2);
      engine.takeSnapshot(snapshot3);
    });

    it('should be able to retrieve latest snapshot', async () => {
      const result = await engine.latestSnapshot('test3');
      expect(result).toEqual(snapshot3);
    });

    it('should be able to correct handle cases where no snapshot is available', async () => {
      const result = await engine.latestSnapshot('test4');
      expect(result).toBeUndefined();
    });
  });

  describe('#events', function () {
    const date = new Date().getTime();
    const event1 = new PersistedEvent({ message: 'hello' }, 1, 'test3', ['a', 'b', 'c'], date);
    const event2 = new PersistedEvent({ message: 'goodbye' }, 2, 'test3', ['a'], date);
    const event3 = new PersistedEvent({ message: 'hello again' }, 3, 'test3', ['b', 'c'], date);

    let engine: SQLitePersistenceEngine;
    beforeEach(() => {
      destroy();
      engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      engine.persist(event1);
      engine.persist(event2);
      engine.persist(event3);
    });

    it('should be able to retrieve previously persisted events', async function () {
      const result = (await engine.events('test3')).reduce<PersistedEvent[]>(
        (prev, evt) => [...prev, evt],
        []
      );
      expect(result).toEqual([event1, event2, event3]);
    });

    it('should be able to specify an offset of previously persisted events', async function () {
      const result = (await engine.events('test3', 1)).reduce<PersistedEvent[]>(
        (prev, evt) => [...prev, evt],
        []
      );
      expect(result).toEqual([event2, event3]);
    });

    it('should be able to filter by tag', async function () {
      const result = await engine.events('test3', undefined, undefined, ['b', 'c']);
      expect(result).toEqual([event1, event3]);
    });
  });
});
