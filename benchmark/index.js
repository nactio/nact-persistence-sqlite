const { persistSuite } = require("./persist");
const { eventsSuite } = require("./events");
const { takeSnapshotSuite } = require("./takeSnapshot");
const { latestSnapshotSuite } = require("./latestSnapshot");

const main = async () => {
  await persistSuite();
  await eventsSuite();
  await takeSnapshotSuite();
  await latestSnapshotSuite();
};

main();
