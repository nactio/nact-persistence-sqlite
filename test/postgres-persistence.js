/* eslint-env mocha */
/* eslint-disable no-unused-expressions, no-new */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;
const delay = (time) => new Promise((resolve, reject) => {
  setTimeout(() => resolve(), time);
});
const { PostgresPersistenceEngine } = require('../lib');
const { PersistedEvent, PersistedSnapshot } = require('nact/lib/persistence');
const pgp = require('pg-promise')();
const { destroy } = require('../lib/schema');

const retry = async (assertion, remainingAttempts, retryInterval = 0) => {
  if (remainingAttempts <= 1) {
    return assertion();
  } else {
    try {
      (await Promise.resolve(assertion()));
    } catch (e) {
      await delay(retryInterval);
      await retry(assertion, remainingAttempts - 1, retryInterval);
    }
  }
};

const connectionString = 'postgres://postgres:testpassword@localhost:5431/testdb';

describe('PostgresPersistenceEngine', function () {
  const db = pgp(connectionString);

  describe('existing connection', () => {
    afterEach(async () => {
      await db.query(destroy(''));
    });

    it('should store values in database', async function () {
      const date = new Date().getTime();
      const engine = new PostgresPersistenceEngine(db);
      await retry(async () => {
        const snapshot1 = new PersistedSnapshot({ message: 'hello' }, 1, 'test', date);
        const snapshot2 = new PersistedSnapshot({ message: 'goodbye' }, 2, 'test', date);
        const snapshot3 = new PersistedSnapshot({ message: 'hello' }, 1, 'test2', date);
        await engine.takeSnapshot(snapshot1);
        await engine.takeSnapshot(snapshot2);
        await engine.takeSnapshot(snapshot3);

        const result =
          (await db.many('SELECT * FROM snapshot_store WHERE persistence_key = \'test\' ORDER BY sequence_nr'))
            .map(PostgresPersistenceEngine.mapDbModelToSnapshotDomainModel);

        result.should.be.lengthOf(2).and.deep.equal([snapshot1, snapshot2]);
        const result2 = await db.one('SELECT * FROM snapshot_store WHERE persistence_key = \'test2\'');
        PostgresPersistenceEngine.mapDbModelToSnapshotDomainModel(result2).should.deep.equal(snapshot3);
      }, 7, 50);
    });
  });

  describe('table creation', () => {
    afterEach(async () => {
      await db.query(destroy(''));
    });

    it('should not create database if createIfNotExists is set to false', async function () {
      new PostgresPersistenceEngine(connectionString, { createIfNotExists: false });
      await delay(300);
      const query = `
      SELECT table_schema,table_name
      FROM information_schema.tables
      WHERE table_name = 'event_journal';`;
      await db.none(query);
    });

    it('should not be able to create databases with prefixes', async function () {
      new PostgresPersistenceEngine(connectionString, { tablePrefix: 'test_prefix_' });
      await delay(300);
      const query = `
      SELECT table_schema,table_name
      FROM information_schema.tables
      WHERE table_name = 'test_prefix_event_journal';`;
      await db.one(query);
      await db.query(destroy('test_prefix_'));
    });
  });

  describe('#persist', function () {
    afterEach(async () => {
      await db.query(destroy(''));
    });
    const date = new Date().getTime();
    it('should store values in database', async function () {
      const engine = new PostgresPersistenceEngine(connectionString);

      const event1 = new PersistedEvent({ message: 'hello' }, 1, 'test', ['a', 'b', 'c'], date);
      const event2 = new PersistedEvent(['message', 'goodbye'], 2, 'test', undefined, date);
      const event3 = new PersistedEvent({ message: 'hello' }, 1, 'test2', undefined, date);
      await engine.persist(event1);
      await engine.persist(event2);
      await engine.persist(event3);

      const result =
          (await db.many('SELECT * FROM event_journal WHERE persistence_key = \'test\' ORDER BY sequence_nr'))
            .map(PostgresPersistenceEngine.mapDbModelToDomainModel);

      result.should.be.lengthOf(2).and.deep.equal([event1, event2]);
      const result2 = await db.one('SELECT * FROM event_journal WHERE persistence_key = \'test2\'');
      PostgresPersistenceEngine.mapDbModelToDomainModel(result2).should.deep.equal(event3);
    });
  });

  describe('#takeSnapshot', function () {
    afterEach(async () => {
      await db.query(destroy(''));
    });
    const date = new Date().getTime();
    it('should store values in database', async function () {
      const engine = new PostgresPersistenceEngine(connectionString);
      await retry(async () => {
        const snapshot1 = new PersistedSnapshot({ message: 'hello' }, 1, 'test', date);
        const snapshot2 = new PersistedSnapshot({ message: 'goodbye' }, 2, 'test', date);
        const snapshot3 = new PersistedSnapshot({ message: 'hello' }, 1, 'test2', date);
        await engine.takeSnapshot(snapshot1);
        await engine.takeSnapshot(snapshot2);
        await engine.takeSnapshot(snapshot3);

        const result =
          (await db.many('SELECT * FROM snapshot_store WHERE persistence_key = \'test\' ORDER BY sequence_nr'))
            .map(PostgresPersistenceEngine.mapDbModelToSnapshotDomainModel);

        result.should.be.lengthOf(2).and.deep.equal([snapshot1, snapshot2]);
        const result2 = await db.one('SELECT * FROM snapshot_store WHERE persistence_key = \'test2\'');
        PostgresPersistenceEngine.mapDbModelToSnapshotDomainModel(result2).should.deep.equal(snapshot3);
      }, 7, 50);
    });
    it('should store arrays in database', async function () {
      const engine = new PostgresPersistenceEngine(connectionString);
      await retry(async () => {
        const snapshot1 = new PersistedSnapshot([ 'hello' ], 1, 'test3', date);
        const snapshot2 = new PersistedSnapshot(['goodbye'], 2, 'test3', date);
        const snapshot3 = new PersistedSnapshot([ 'hello' ], 1, 'test4', date);
        await engine.takeSnapshot(snapshot1);
        await engine.takeSnapshot(snapshot2);
        await engine.takeSnapshot(snapshot3);

        const result =
          (await db.many('SELECT * FROM snapshot_store WHERE persistence_key = \'test3\' ORDER BY sequence_nr'))
            .map(PostgresPersistenceEngine.mapDbModelToSnapshotDomainModel);

        result.should.be.lengthOf(2).and.deep.equal([snapshot1, snapshot2]);
        const result2 = await db.one('SELECT * FROM snapshot_store WHERE persistence_key = \'test4\'');
        PostgresPersistenceEngine.mapDbModelToSnapshotDomainModel(result2).should.deep.equal(snapshot3);
      }, 7, 50);
    });
  });

  describe('#latestSnapshot', function () {
    const date = new Date().getTime();
    const snapshot1 = new PersistedSnapshot({ message: 'hello' }, 1, 'test3', date);
    const snapshot2 = new PersistedSnapshot({ message: 'goodbye' }, 2, 'test3', date);
    const snapshot3 = new PersistedSnapshot({ message: 'hello again' }, 3, 'test3', date);
    let engine;

    beforeEach(async () => {
      engine = new PostgresPersistenceEngine(connectionString);
      await engine.takeSnapshot(snapshot1);
      await engine.takeSnapshot(snapshot2);
      await engine.takeSnapshot(snapshot3);
    });
    afterEach(async () => {
      await db.query(destroy(''));
    });

    it('should be able to retrieve latest snapshot', async function () {
      const result = await engine.latestSnapshot('test3');
      result.should.deep.equal(snapshot3);
    });

    it('should be able to correct handle cases where no snapshot is available', async function () {
      const result = await engine.latestSnapshot('test4');
      expect(result).to.equal(undefined);
    });
  });

  describe('#events', async function () {
    const date = new Date().getTime();
    const event1 = new PersistedEvent({ message: 'hello' }, 1, 'test3', ['a', 'b', 'c'], date);
    const event2 = new PersistedEvent({ message: 'goodbye' }, 2, 'test3', ['a'], date);
    const event3 = new PersistedEvent({ message: 'hello again' }, 3, 'test3', ['b', 'c'], date);
    let engine;

    beforeEach(async () => {
      engine = new PostgresPersistenceEngine(connectionString);
      await engine.persist(event1);
      await engine.persist(event2);
      await engine.persist(event3);
    });
    afterEach(async () => {
      await db.query(destroy(''));
    });

    it('should be able to retrieve previously persisted events', async function () {
      const result = await engine.events('test3').reduce((prev, evt) => [...prev, evt], []);
      result.should.deep.equal([event1, event2, event3]);
    });

    it('should be able to specify an offset of previously persisted events', async function () {
      const result = await engine.events('test3', 1).reduce((prev, evt) => [...prev, evt], []);
      result.should.deep.equal([event2, event3]);
    });

    it('should be able to filter by tag', async function () {
      const result = await engine.events('test3', undefined, undefined, ['b', 'c']);
      result.should.deep.equal([event1, event3]);
    });
  });
});
