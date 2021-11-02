import React from 'react';
import { useStore } from 'store';
import useOffChainDatabase from 'hooks/useOffChainDatabase';
import { ipcRenderer, remote } from 'electron';
import * as offChainDatabaseExportImport from 'hooks/useOffChainDatabase/exportImport';
import { sleep } from 'utils';
import * as Quorum from 'utils/quorum';

export default () => {
  const { confirmDialogStore, groupStore, nodeStore } = useStore();
  const offChainDatabase = useOffChainDatabase();

  React.useEffect(() => {
    ipcRenderer.send('renderer-quit-prompt');
    ipcRenderer.on('main-before-quit', async () => {
      if (
        confirmDialogStore.open &&
        confirmDialogStore.loading &&
        confirmDialogStore.okText === '重启'
      ) {
        confirmDialogStore.hide();
      } else {
        const ownerGroupCount = groupStore.groups.filter(
          (group) => group.OwnerPubKey === nodeStore.info.node_publickey
        ).length;
        const res = await remote.dialog.showMessageBox({
          type: 'question',
          buttons: ['确定', '取消'],
          title: '退出节点',
          message: ownerGroupCount
            ? `你创建的 ${ownerGroupCount} 个群组需要你保持在线，维持出块。如果你的节点下线了，这些群组将不能发布新的内容，确定退出吗？`
            : '你的节点即将下线，确定退出吗？',
        });
        if (res.response === 1) {
          return;
        }
      }
      ipcRenderer.send('renderer-will-quit');
      await sleep(500);
      try {
        await offChainDatabaseExportImport.exportTo(
          offChainDatabase,
          nodeStore.storagePath
        );
        if (nodeStore.status.up) {
          nodeStore.setQuitting(true);
          if (nodeStore.status.up) {
            await Quorum.down();
          }
        }
      } catch (err) {
        console.error(err);
      }
      ipcRenderer.send('renderer-quit');
    });
  }, []);
};