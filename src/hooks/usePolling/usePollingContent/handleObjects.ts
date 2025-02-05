import { IObjectItem } from 'apis/group';
import { Store } from 'store';
import Database from 'hooks/useDatabase/database';
import { ContentStatus } from 'hooks/useDatabase/contentStatus';
import * as ObjectModel from 'hooks/useDatabase/models/object';

interface IOptions {
  groupId: string
  objects: IObjectItem[]
  store: Store
  database: Database
}

export default async (options: IOptions) => {
  const { database, groupId, objects, store } = options;
  const { latestStatusStore, activeGroupStore, groupStore } = store;

  if (objects.length === 0) {
    return;
  }

  try {
    await database.transaction(
      'rw',
      [
        database.objects,
        database.summary,
        database.persons,
        database.latestStatus,
      ],
      async () => {
        const existObjects = await ObjectModel.bulkGet(database, objects.map((v) => v.TrxId));
        const items = objects.map((object, i) => ({ object, existObject: existObjects[i] }));

        // unread
        const latestStatus = latestStatusStore.map[groupId] || latestStatusStore.DEFAULT_LATEST_STATUS;
        const unreadObjects = objects.filter(
          (object) => {
            const group = groupStore.map[groupId] || {};
            return !activeGroupStore.objectTrxIdSet.has(object.TrxId)
            && object.TimeStamp > latestStatus.latestReadTimeStamp && group.user_pubkey !== object.Publisher;
          },
        );

        // save
        const objectsToAdd: Array<ObjectModel.IDbObjectItem> = [];
        const objectIdsToMarkAssynchronized: Array<number> = [];
        items.filter((v) => !v.existObject).forEach(({ object }) => {
          objectsToAdd.push({
            ...object,
            GroupId: groupId,
            Status: ContentStatus.synced,
          });
        });
        items.filter((v) => v.existObject).forEach(({ object, existObject }) => {
          if (existObject && existObject.Status !== ContentStatus.syncing) {
            return;
          }
          objectIdsToMarkAssynchronized.push(existObject.Id!);
          if (store.activeGroupStore.id === groupId) {
            const syncedObject = {
              ...existObject,
              ...object,
              Status: ContentStatus.synced,
            };
            store.activeGroupStore.updateObject(
              existObject.TrxId,
              syncedObject,
            );
          }
        });

        const latestObject = objects[objects.length - 1];
        const unreadCount = latestStatus.unreadCount + unreadObjects.length;
        await Promise.all([
          ObjectModel.bulkCreate(database, objectsToAdd),
          ObjectModel.bulkMarkedAsSynced(database, objectIdsToMarkAssynchronized),
          latestStatusStore.updateMap(database, groupId, {
            unreadCount,
            latestObjectTimeStamp: latestObject.TimeStamp,
          }),
        ]);
      },
    );
  } catch (e) {
    console.error(e);
  }
};
