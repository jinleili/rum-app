import React from 'react';
import { useStore } from 'store';
import { ipcRenderer } from 'electron';
import sleep from 'utils/sleep';
import useExitNode from 'hooks/useExitNode';
import useActiveGroup from 'store/selectors/useActiveGroup';

export default () => {
  const { confirmDialogStore, groupStore } = useStore();
  const activeGroup = useActiveGroup();
  const exitNode = useExitNode();

  React.useEffect(() => {
    const beforeQuit = async () => {
      if (
        confirmDialogStore.open
        && confirmDialogStore.loading
        && confirmDialogStore.okText === '重启'
      ) {
        confirmDialogStore.hide();
      } else {
        const ownerGroupCount = groupStore.groups.filter(
          (group) => group.owner_pubkey === activeGroup.user_pubkey,
        ).length;
        const res = await ipcRenderer.invoke('message-box', {
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
      ipcRenderer.send('disable-app-quit-prompt');
      await sleep(500);
      await exitNode();
      ipcRenderer.send('app-quit');
    };
    ipcRenderer.send('app-quit-prompt');
    ipcRenderer.on('app-before-quit', beforeQuit);
    return () => {
      ipcRenderer.off('app-before-quit', beforeQuit);
    };
  }, []);
};
