const { persistSuite } = require("./persist");
const { eventsSuite } = require("./events");

const main = async () => {
  await persistSuite();
  await eventsSuite();
};

main();
