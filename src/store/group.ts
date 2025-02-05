import GroupApi, { GroupStatus, IGroup } from 'apis/group';
import { observable, runInAction, when } from 'mobx';

export interface IProfile {
  name: string
  avatar: string
  mixinUID?: string
}


export function createGroupStore() {
  return {
    map: {} as Record<string, IGroup>,

    latestTrxIdMap: '',

    lastReadTrxIdMap: '',

    get ids() {
      return Object.keys(this.map);
    },

    get groups() {
      return Object.values(this.map);
    },

    hasGroup(id: string) {
      return id in this.map;
    },

    addGroups(groups: IGroup[] = []) {
      groups.forEach((newGroup) => {
        // update existing group
        if (newGroup.group_id in this.map) {
          this.updateGroup(newGroup.group_id, newGroup);
          return;
        }

        // add new group
        this.map[newGroup.group_id] = observable({
          ...newGroup,
        });
      });
    },

    updateGroup(
      id: string,
      updatedGroup: Partial<IGroup & { backgroundSync: boolean }>,
    ) {
      if (!(id in this.map)) {
        throw new Error(`group ${id} not found in map`);
      }
      runInAction(() => {
        const group = this.map[id];
        if (group) {
          const newGroup = { ...group, ...updatedGroup };
          Object.assign(group, newGroup);
        }
      });
    },

    deleteGroup(id: string) {
      runInAction(() => {
        delete this.map[id];
      });
    },

    async syncGroup(groupId: string) {
      const group = this.map[groupId];

      if (!group) {
        throw new Error(`group ${groupId} not found in map`);
      }

      if (group.group_status === GroupStatus.SYNCING) {
        return;
      }

      try {
        this.updateGroup(groupId, {
          group_status: GroupStatus.SYNCING,
        });
        GroupApi.syncGroup(groupId);
        await when(() => group.group_status === GroupStatus.IDLE);
      } catch (e) {
        console.log(e);
      }
    },
  };
}
