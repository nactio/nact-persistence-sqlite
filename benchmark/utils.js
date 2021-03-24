const { PersistedEvent, PersistedSnapshot } = require("nact/lib/persistence");
const fs = require("fs");

const destroy = (dbFilename) => {
  if (fs.existsSync(dbFilename)) fs.unlinkSync(dbFilename);
};

const delay = (time) =>
  new Promise((resolve, reject) => {
    setTimeout(() => resolve(), time);
  });

const makeEvent = (i, key) =>
  new PersistedEvent(
    {
      type: "TEST_EVENT",
      data: {
        num: i + 1234567890123456,
        text: `${i + 1234567890123456}`,
      },
    },
    i,
    key
  );

const makeSnapshot = (i, key) =>
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

module.exports = {
  delay,
  destroy,
  makeEvent,
  makeSnapshot,
};
