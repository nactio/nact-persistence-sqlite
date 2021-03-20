/* eslint-env mocha */
/* eslint-disable no-unused-expressions, no-new */
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;
const delay = (time) =>
  new Promise((resolve, reject) => {
    setTimeout(() => resolve(), time);
  });
const { SQLitePersistenceEngine } = require("../lib");
const Database = require("better-sqlite3");

const { PersistedEvent, PersistedSnapshot } = require("nact/lib/persistence");
// const { destroy } = require("../lib/schema");
const fs = require("fs");

const retry = async (assertion, remainingAttempts, retryInterval = 0) => {
  if (remainingAttempts <= 1) {
    return assertion();
  } else {
    try {
      await Promise.resolve(assertion());
    } catch (e) {
      await delay(retryInterval);
      await retry(assertion, remainingAttempts - 1, retryInterval);
    }
  }
};

const dbFilename = "test-sqlite-persistence.db";

const destroy = () => {
  fs.unlinkSync(dbFilename);
};

describe("SQLitePersistenceEngine", function () {
  const db = Database(dbFilename, { createIfNotExists: true });

  describe("existing connection", () => {
    afterEach(destroy);

    it("should store values in database", async function () {
      const date = new Date().getTime();
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      await retry(
        async () => {
          const snapshot1 = new PersistedSnapshot(
            { message: "hello" },
            1,
            "test",
            date
          );
          const snapshot2 = new PersistedSnapshot(
            { message: "goodbye" },
            2,
            "test",
            date
          );
          const snapshot3 = new PersistedSnapshot(
            { message: "hello" },
            1,
            "test2",
            date
          );
          await engine.takeSnapshot(snapshot1);
          await engine.takeSnapshot(snapshot2);
          await engine.takeSnapshot(snapshot3);

          const result = db
            .prepare(
              "SELECT * FROM snapshot_store WHERE persistence_key = 'test' ORDER BY sequence_nr"
            )
            .all()
            .map(SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);
          console.log("result:", result);
          result.should.be.lengthOf(2).and.deep.equal([snapshot1, snapshot2]);
          const result2 = db
            .prepare(
              "SELECT * FROM snapshot_store WHERE persistence_key = 'test2'"
            )
            .all();
          SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel(
            result2
          ).should.deep.equal(snapshot3);
        },
        0,
        50
      );
    });
  });

  describe("#tables", function () {
    describe("table creation backwards compatibility", () => {
      afterEach(destroy);

      // it("should not create database if createIfNotExists is set to false", async function () {
      //   new SQLitePersistenceEngine(connectionString, {
      //     createIfNotExists: false,
      //   });
      //   await delay(300);
      //   const query = `
      //     SELECT table_schema,table_name
      //     FROM information_schema.tables
      //     WHERE table_name = 'event_journal';`;
      //   await db.none(query);
      // });

      // it("should not be able to create databases with prefixes", async function () {
      //   new SQLitePersistenceEngine(connectionString, {
      //     tablePrefix: "test_prefix_",
      //   });
      //   await delay(300);
      //   const query = `
      //     SELECT table_schema,table_name
      //     FROM information_schema.tables
      //     WHERE table_name = 'test_prefix_event_journal';`;
      //   await db.one(query);
      //   await db.query(destroy("test_prefix_"));
      // });
    });

    describe("table creation with prefixes, table names, and schemas", () => {
      afterEach(destroy);

      // it("should not create database if createIfNotExists is set to false", async function () {
      //   new SQLitePersistenceEngine(connectionString, {
      //     createIfNotExists: false,
      //     tablePrefix: "test_schema_",
      //     schema: "test",
      //   });
      //   await delay(300);
      //   const query = `
      //     SELECT table_schema,table_name
      //     FROM information_schema.tables
      //     WHERE table_name = 'test_schema_event_log' AND table_schema = 'test';`;
      //   await db.none(query);
      // });

      // it("should not be able to create databases with prefixes and schema", async function () {
      //   new SQLitePersistenceEngine(connectionString, {
      //     tablePrefix: "test_schema_",
      //     schema: "test",
      //     eventTable: "event_log",
      //     snapshotTable: "snapshot_log",
      //   });
      //   await delay(300);
      //   const query = `
      //     SELECT table_schema,table_name
      //     FROM information_schema.tables
      //     WHERE table_name = 'test_schema_event_log' AND table_schema = 'test';`;
      //   await db.one(query);
      //   await db.query(
      //     destroy("test_schema_", "test", "event_log", "snapshot_log")
      //   );
      // });

      // it("should be able to create databases with prefixes and schema", async function () {
      //   new SQLitePersistenceEngine(connectionString, {
      //     createIfNotExists: true,
      //     tablePrefix: "test_schema_",
      //     schema: "test",
      //     eventTable: "event_log",
      //     snapshotTable: "snapshot_log",
      //   });
      //   await delay(300);
      //   const query = `
      //     SELECT table_schema,table_name
      //     FROM information_schema.tables
      //     WHERE table_name = 'test_schema_event_log' AND table_schema = 'test';`;
      //   await db.one(query);
      //   await db.query(
      //     destroy("test_schema_", "test", "event_log", "snapshot_log")
      //   );
      // });
    });
  });

  describe("#persist", function () {
    afterEach(destroy);

    const date = new Date().getTime();
    it("should store values in database", async function () {
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });

      const event1 = new PersistedEvent(
        { message: "hello" },
        1,
        "test",
        ["a", "b", "c"],
        date
      );
      const event2 = new PersistedEvent(
        ["message", "goodbye"],
        2,
        "test",
        undefined,
        date
      );
      const event3 = new PersistedEvent(
        { message: "hello" },
        1,
        "test2",
        undefined,
        date
      );
      await engine.persist(event1);
      await engine.persist(event2);
      await engine.persist(event3);

      const result = (
        await db.many(
          "SELECT * FROM event_journal WHERE persistence_key = 'test' ORDER BY sequence_nr"
        )
      ).map(SQLitePersistenceEngine.mapDbModelToDomainModel);

      result.should.be.lengthOf(2).and.deep.equal([event1, event2]);
      const result2 = await db.one(
        "SELECT * FROM event_journal WHERE persistence_key = 'test2'"
      );
      SQLitePersistenceEngine.mapDbModelToDomainModel(
        result2
      ).should.deep.equal(event3);
    });
  });

  describe("#takeSnapshot", function () {
    afterEach(destroy);

    const date = new Date().getTime();
    it("should store values in database", async function () {
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      await retry(
        async () => {
          const snapshot1 = new PersistedSnapshot(
            { message: "hello" },
            1,
            "test",
            date
          );
          const snapshot2 = new PersistedSnapshot(
            { message: "goodbye" },
            2,
            "test",
            date
          );
          const snapshot3 = new PersistedSnapshot(
            { message: "hello" },
            1,
            "test2",
            date
          );
          await engine.takeSnapshot(snapshot1);
          await engine.takeSnapshot(snapshot2);
          await engine.takeSnapshot(snapshot3);

          const result = (
            await db.many(
              "SELECT * FROM snapshot_store WHERE persistence_key = 'test' ORDER BY sequence_nr"
            )
          ).map(SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);

          result.should.be.lengthOf(2).and.deep.equal([snapshot1, snapshot2]);
          const result2 = await db.one(
            "SELECT * FROM snapshot_store WHERE persistence_key = 'test2'"
          );
          SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel(
            result2
          ).should.deep.equal(snapshot3);
        },
        0,
        50
      );
    });
    it("should store arrays in database", async function () {
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      await retry(
        async () => {
          const snapshot1 = new PersistedSnapshot(["hello"], 1, "test3", date);
          const snapshot2 = new PersistedSnapshot(
            ["goodbye"],
            2,
            "test3",
            date
          );
          const snapshot3 = new PersistedSnapshot(["hello"], 1, "test4", date);
          await engine.takeSnapshot(snapshot1);
          await engine.takeSnapshot(snapshot2);
          await engine.takeSnapshot(snapshot3);

          const result = (
            await db.many(
              "SELECT * FROM snapshot_store WHERE persistence_key = 'test3' ORDER BY sequence_nr"
            )
          ).map(SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel);

          result.should.be.lengthOf(2).and.deep.equal([snapshot1, snapshot2]);
          const result2 = await db.one(
            "SELECT * FROM snapshot_store WHERE persistence_key = 'test4'"
          );
          SQLitePersistenceEngine.mapDbModelToSnapshotDomainModel(
            result2
          ).should.deep.equal(snapshot3);
        },
        0,
        50
      );
    });
  });

  describe("#latestSnapshot", function () {
    const date = new Date().getTime();
    const snapshot1 = new PersistedSnapshot(
      { message: "hello" },
      1,
      "test3",
      date
    );
    const snapshot2 = new PersistedSnapshot(
      { message: "goodbye" },
      2,
      "test3",
      date
    );
    const snapshot3 = new PersistedSnapshot(
      { message: "hello again" },
      3,
      "test3",
      date
    );
    let engine;

    beforeEach(async () => {
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      await engine.takeSnapshot(snapshot1);
      await engine.takeSnapshot(snapshot2);
      await engine.takeSnapshot(snapshot3);
    });
    afterEach(destroy);

    it("should be able to retrieve latest snapshot", async function () {
      const result = await engine.latestSnapshot("test3");
      result.should.deep.equal(snapshot3);
    });

    it("should be able to correct handle cases where no snapshot is available", async function () {
      const result = await engine.latestSnapshot("test4");
      expect(result).to.equal(undefined);
    });
  });

  describe("#events", async function () {
    const date = new Date().getTime();
    const event1 = new PersistedEvent(
      { message: "hello" },
      1,
      "test3",
      ["a", "b", "c"],
      date
    );
    const event2 = new PersistedEvent(
      { message: "goodbye" },
      2,
      "test3",
      ["a"],
      date
    );
    const event3 = new PersistedEvent(
      { message: "hello again" },
      3,
      "test3",
      ["b", "c"],
      date
    );
    let engine;

    beforeEach(async () => {
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      await engine.persist(event1);
      await engine.persist(event2);
      await engine.persist(event3);
    });
    afterEach(destroy);

    it("should be able to retrieve previously persisted events", async function () {
      const result = await engine
        .events("test3")
        .reduce((prev, evt) => [...prev, evt], []);
      result.should.deep.equal([event1, event2, event3]);
    });

    it("should be able to specify an offset of previously persisted events", async function () {
      const result = await engine
        .events("test3", 1)
        .reduce((prev, evt) => [...prev, evt], []);
      result.should.deep.equal([event2, event3]);
    });

    it("should be able to filter by tag", async function () {
      const result = await engine.events("test3", undefined, undefined, [
        "b",
        "c",
      ]);
      result.should.deep.equal([event1, event3]);
    });
  });
});
