import { eventsSuite } from './events';
import { latestSnapshotSuite } from './latestSnapshot';
import { persistSuite } from './persist';
import { takeSnapshotSuite } from './takeSnapshot';

const main = async () => {
  await persistSuite();
  await eventsSuite();
  await takeSnapshotSuite();
  await latestSnapshotSuite();
};

main();
