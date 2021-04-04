"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("./events");
const latestSnapshot_1 = require("./latestSnapshot");
const persist_1 = require("./persist");
const takeSnapshot_1 = require("./takeSnapshot");
const main = async () => {
    await persist_1.persistSuite();
    await events_1.eventsSuite();
    await takeSnapshot_1.takeSnapshotSuite();
    await latestSnapshot_1.latestSnapshotSuite();
};
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9iZW5jaC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFDQUF1QztBQUN2QyxxREFBdUQ7QUFDdkQsdUNBQXlDO0FBQ3pDLGlEQUFtRDtBQUVuRCxNQUFNLElBQUksR0FBRyxLQUFLLElBQUksRUFBRTtJQUN0QixNQUFNLHNCQUFZLEVBQUUsQ0FBQztJQUNyQixNQUFNLG9CQUFXLEVBQUUsQ0FBQztJQUNwQixNQUFNLGdDQUFpQixFQUFFLENBQUM7SUFDMUIsTUFBTSxvQ0FBbUIsRUFBRSxDQUFDO0FBQzlCLENBQUMsQ0FBQztBQUVGLElBQUksRUFBRSxDQUFDIn0=