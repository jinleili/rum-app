import { IGroup, ICreateGroupsResult, IContentItem } from 'apis/group';
import Store from 'electron-store';
import moment from 'moment';

interface LastReadContentTrxIdMap {
  [key: string]: number;
}

export enum Status {
  PUBLISHED,
  PUBLISHING,
  FAILED,
}

const store = new Store();

const STORE_GROUPS_LATEST_CONTENT_TIME_STAMP_MAP =
  'GROUPS_LATEST_CONTENT_TIME_STAMP_MAP';

export function createGroupStore() {
  return {
    id: '',

    ids: <string[]>[],

    map: <{ [key: string]: IGroup }>{},

    contentTrxIds: <string[]>[],

    contentMap: <{ [key: string]: IContentItem }>{},

    justAddedContentTrxId: '',

    statusMap: <{ [key: string]: Status }>{},

    // only for current group
    currentGroupLatestContentTimeStampSet: new Set(),

    // only for current group
    currentGroupEarliestContentTimeStamp: 0,

    // for all groups
    groupsLatestContentTimeStampMap: (store.get(
      STORE_GROUPS_LATEST_CONTENT_TIME_STAMP_MAP
    ) || {}) as LastReadContentTrxIdMap,

    unReadCountMap: {} as any,

    get isSelected() {
      return !!this.id;
    },

    get groups() {
      return this.ids
        .map((id: any) => this.map[id])
        .sort((a, b) => b.LastUpdate - a.LastUpdate);
    },

    get contentTotal() {
      return this.contentTrxIds.length;
    },

    get contents() {
      return this.contentTrxIds
        .map((trxId: any) => this.contentMap[trxId])
        .sort((a, b) => b.TimeStamp - a.TimeStamp);
    },

    get group() {
      return this.map[this.id] || {};
    },

    get groupSeed() {
      return this.getSeedFromStore(this.id);
    },

    get statusText() {
      const map = {
        GROUP_READY: '已同步',
        GROUP_SYNCING: '同步中',
      };
      return map[this.group.GroupStatus];
    },

    setId(id: string) {
      if (this.id === id) {
        return;
      }
      if (!this.map[id]) {
        console.error(`groupStore.setId：id 对应的 group 不存在`);
        return;
      }
      this.id = id;
      this.clearAfterGroupChanged();
    },

    addGroups(groups: IGroup[] = []) {
      for (const group of groups) {
        if (!this.map[group.GroupId]) {
          this.ids.unshift(group.GroupId);
        }
        this.map[group.GroupId] = group;
      }
    },

    updateGroups(groups: IGroup[] = []) {
      const current = groups.find((group) => group.GroupId === this.id);
      if (current) {
        this.group.LastUpdate = current.LastUpdate;
        this.group.LatestBlockNum = current.LatestBlockNum;
        this.group.LatestBlockId = current.LatestBlockId;
        this.group.GroupStatus = current.GroupStatus;
      }
    },

    removeGroup() {
      const removedId = this.id;
      this.id = '';
      this.ids = this.ids.filter((id) => id !== removedId);
      delete this.map[removedId];
      this.clearAfterGroupChanged();
    },

    reset() {
      this.id = '';
      this.ids = [];
      this.map = {};
      this.clearAfterGroupChanged();
    },

    clearAfterGroupChanged() {
      this.contentTrxIds = [];
      this.contentMap = {};
      this.justAddedContentTrxId = '';
      this.currentGroupLatestContentTimeStampSet.clear();
    },

    saveSeedToStore(group: ICreateGroupsResult) {
      store.set(`group_seed_${group.group_id}`, group);
    },

    getSeedFromStore(id: string) {
      return store.get(`group_seed_${id}`);
    },

    addContents(contents: IContentItem[] = []) {
      for (const content of contents) {
        this.statusMap[content.TrxId] = this.getContentStatus(content);
        if (this.contentMap[content.TrxId]) {
          if (content.Publisher) {
            this.contentMap[content.TrxId] = content;
          }
        } else {
          this.contentTrxIds.unshift(content.TrxId);
          this.contentMap[content.TrxId] = content;
        }
      }
      if (this.contentTotal > 0) {
        const contents = this.contents;
        const latestContent = contents[0];
        const earliestContent = contents[this.contentTotal - 1];
        this.setLatestContentTimeStamp(this.id, latestContent.TimeStamp);
        this.currentGroupEarliestContentTimeStamp = earliestContent.TimeStamp;
      }
    },

    setJustAddedContentTrxId(trxId: string) {
      this.justAddedContentTrxId = trxId;
    },

    addCurrentGroupLatestContentTimeStamp(timestamp: number) {
      this.currentGroupLatestContentTimeStampSet.add(timestamp);
    },

    getContentStatus(content: IContentItem) {
      if (content.Publisher) {
        return Status.PUBLISHED;
      }
      if (
        moment
          .duration(moment().diff(moment(content.TimeStamp / 1000000)))
          .asSeconds() > 20
      ) {
        return Status.FAILED;
      }
      return Status.PUBLISHING;
    },

    markAsFailed(txId: string) {
      this.statusMap[txId] = Status.FAILED;
    },

    saveCachedNewContent(key: string, content: IContentItem) {
      const cachedNewContents: any = this.getCachedNewContents(key);
      cachedNewContents.push(content);
      store.set(key, cachedNewContents);
    },

    removeCachedNewContent(key: string, txId: string) {
      const cachedNewContents: IContentItem[] = this.getCachedNewContents(key);
      store.set(
        key,
        cachedNewContents.filter((content) => content.TrxId !== txId)
      );
    },

    getCachedNewContents(key: string) {
      return (store.get(key) || []) as IContentItem[];
    },

    setLatestContentTimeStamp(groupId: string, timeStamp: number) {
      this.groupsLatestContentTimeStampMap[groupId] = timeStamp;
      store.set(
        STORE_GROUPS_LATEST_CONTENT_TIME_STAMP_MAP,
        this.groupsLatestContentTimeStampMap
      );
    },

    updateUnReadCountMap(groupId: string, count: number) {
      this.unReadCountMap[groupId] = count;
    },
  };
}
