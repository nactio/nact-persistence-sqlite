/* eslint-env jest */
/* eslint-disable no-unused-expressions, no-new */

const delay = (time) =>
  new Promise((resolve, reject) => {
    setTimeout(() => resolve(), time);
  });
const { SQLitePersistenceEngine } = require("../lib");
const Database = require("better-sqlite3");
const fs = require("fs");

const { PersistedEvent, PersistedSnapshot } = require("nact/lib/persistence");

const dbFilename = "test-sqlite-persistence.sqlite";

const destroy = () => {
  if (fs.existsSync(dbFilename)) fs.unlinkSync(dbFilename);
};

describe("SQLitePersistenceEngine", function () {
  // const db = Database(dbFilename, { createIfNotExists: true });

  describe("existing connection", () => {
    beforeEach(destroy);

    it("should store values in database", function () {
      const date = new Date().getTime();
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
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
      engine.takeSnapshot(snapshot1);
      engine.takeSnapshot(snapshot2);
      engine.takeSnapshot(snapshot3);

      const result = engine.db
        .prepare(
          "SELECT * FROM snapshot_store WHERE persistence_key = 'test' ORDER BY sequence_nr"
        )
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

  describe("#tables", function () {
    describe("table creation backwards compatibility", () => {
      beforeEach(destroy);

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
      beforeEach(destroy);

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
    beforeEach(destroy);

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
      engine.persist(event1);
      engine.persist(event2);
      engine.persist(event3);

      const result = engine.db
        .prepare(
          "SELECT * FROM event_journal WHERE persistence_key = 'test' ORDER BY sequence_nr"
        )
        .all()
        .map(SQLitePersistenceEngine.mapDbModelToDomainModel);

      console.log("result", result);
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

  describe("#takeSnapshot", function () {
    beforeEach(destroy);

    const date = new Date().getTime();
    it("should store values in database", function () {
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
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
      engine.takeSnapshot(snapshot1);
      engine.takeSnapshot(snapshot2);
      engine.takeSnapshot(snapshot3);

      const result = engine.db
        .prepare(
          "SELECT * FROM snapshot_store WHERE persistence_key = 'test' ORDER BY sequence_nr"
        )
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

    it("should store arrays in database", function () {
      const engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      const snapshot1 = new PersistedSnapshot(["hello"], 1, "test3", date);
      const snapshot2 = new PersistedSnapshot(["goodbye"], 2, "test3", date);
      const snapshot3 = new PersistedSnapshot(["hello"], 1, "test4", date);
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
    beforeEach(() => {
      destroy();
      engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      engine.takeSnapshot(snapshot1);
      engine.takeSnapshot(snapshot2);
      engine.takeSnapshot(snapshot3);
    });

    it("should be able to retrieve latest snapshot", function () {
      const result = engine.latestSnapshot("test3");
      expect(result).toEqual(snapshot3);
    });

    it("should be able to correct handle cases where no snapshot is available", function () {
      const result = engine.latestSnapshot("test4");
      expect(result).toBeUndefined();
    });
  });

  fdescribe("#events", function () {
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
    beforeEach(() => {
      destroy();
      engine = new SQLitePersistenceEngine(dbFilename, {
        createIfNotExists: true,
      });
      engine.persist(event1);
      engine.persist(event2);
      engine.persist(event3);
    });

    it("should be able to retrieve previously persisted events", async function () {
      const result = await engine
        .events("test3")
        .reduce((prev, evt) => [...prev, evt], []);
      expect(result).toEqual([event1, event2, event3]);
    });

    it("should be able to specify an offset of previously persisted events", async function () {
      const result = await engine
        .events("test3", 1)
        .reduce((prev, evt) => [...prev, evt], []);
      expect(result).toEqual([event2, event3]);
    });

    it("should be able to filter by tag", async function () {
      const result = await engine.events("test3", undefined, undefined, [
        "b",
        "c",
      ]);
      expect(result).toEqual([event1, event3]);
    });
  });
});
