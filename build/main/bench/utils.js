"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSnapshot = exports.makeEvent = exports.destroy = exports.delay = void 0;
const fs_1 = __importDefault(require("fs"));
const persistence_1 = require("@nact/persistence");
exports.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.destroy = (dbFilename) => {
    if (fs_1.default.existsSync(dbFilename))
        fs_1.default.unlinkSync(dbFilename);
};
exports.makeEvent = (i, key) => new persistence_1.PersistedEvent({
    type: 'TEST_EVENT',
    data: {
        num: i + 1234567890123456,
        text: `${i + 1234567890123456}`,
    },
}, i, key);
exports.makeSnapshot = (i, key) => new persistence_1.PersistedSnapshot({
    data: {
        num: i + 1234567890123456,
        text: `${i + 1234567890123456}`,
    },
}, i, key);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9iZW5jaC91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw0Q0FBb0I7QUFFcEIsbURBQXNFO0FBRXpELFFBQUEsS0FBSyxHQUFHLENBQUMsRUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRTFFLFFBQUEsT0FBTyxHQUFHLENBQUMsVUFBVSxFQUFFLEVBQUU7SUFDcEMsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUFFLFlBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDM0QsQ0FBQyxDQUFDO0FBRVcsUUFBQSxTQUFTLEdBQUcsQ0FBQyxDQUFTLEVBQUUsR0FBVyxFQUFFLEVBQUUsQ0FDbEQsSUFBSSw0QkFBYyxDQUNoQjtJQUNFLElBQUksRUFBRSxZQUFZO0lBQ2xCLElBQUksRUFBRTtRQUNKLEdBQUcsRUFBRSxDQUFDLEdBQUcsZ0JBQWdCO1FBQ3pCLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxnQkFBZ0IsRUFBRTtLQUNoQztDQUNGLEVBQ0QsQ0FBQyxFQUNELEdBQUcsQ0FDSixDQUFDO0FBRVMsUUFBQSxZQUFZLEdBQUcsQ0FBQyxDQUFTLEVBQUUsR0FBVyxFQUFFLEVBQUUsQ0FDckQsSUFBSSwrQkFBaUIsQ0FDbkI7SUFDRSxJQUFJLEVBQUU7UUFDSixHQUFHLEVBQUUsQ0FBQyxHQUFHLGdCQUFnQjtRQUN6QixJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsZ0JBQWdCLEVBQUU7S0FDaEM7Q0FDRixFQUNELENBQUMsRUFDRCxHQUFHLENBQ0osQ0FBQyJ9