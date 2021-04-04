import fs from 'fs';

import { PersistedEvent, PersistedSnapshot } from 'nact/lib/persistence';

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const destroy = (dbFilename) => {
  if (fs.existsSync(dbFilename)) fs.unlinkSync(dbFilename);
};

export const makeEvent = (i: number, key: string) =>
  new PersistedEvent(
    {
      type: 'TEST_EVENT',
      data: {
        num: i + 1234567890123456,
        text: `${i + 1234567890123456}`,
      },
    },
    i,
    key
  );

export const makeSnapshot = (i: number, key: string) =>
  new PersistedSnapshot(
    {
      data: {
        num: i + 1234567890123456,
        text: `${i + 1234567890123456}`,
      },
    },
    i,
    key
  );
