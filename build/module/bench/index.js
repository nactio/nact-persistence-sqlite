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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9iZW5jaC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkQsTUFBTSxJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7SUFDdEIsTUFBTSxZQUFZLEVBQUUsQ0FBQztJQUNyQixNQUFNLFdBQVcsRUFBRSxDQUFDO0lBQ3BCLE1BQU0saUJBQWlCLEVBQUUsQ0FBQztJQUMxQixNQUFNLG1CQUFtQixFQUFFLENBQUM7QUFDOUIsQ0FBQyxDQUFDO0FBRUYsSUFBSSxFQUFFLENBQUMifQ==