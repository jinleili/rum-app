import React from 'react';
import { ipcRenderer } from 'electron';
import { observer, useLocalObservable } from 'mobx-react-lite';
import Dialog from 'components/Dialog';
import Button from 'components/Button';
import { useStore } from 'store';
import copy from 'copy-to-clipboard';
import MiddleTruncate from 'components/MiddleTruncate';
import NetworkInfoModal from './NetworkInfoModal';
import Tooltip from '@material-ui/core/Tooltip';
import { GoChevronRight } from 'react-icons/go';
import sleep from 'utils/sleep';
import formatPath from 'utils/formatPath';
import setExternalNodeSetting from 'standaloneModals/setExternalNodeSetting';
import useExitNode from 'hooks/useExitNode';

interface IProps {
  open: boolean
  onClose: () => void
}

const MyNodeInfo = observer(() => {
  const { nodeStore, snackbarStore, confirmDialogStore } = useStore();
  const state = useLocalObservable(() => ({
    port: nodeStore.port,
    showNetworkInfoModal: false,
  }));

  const exitNode = useExitNode();

  const onExitNode = React.useCallback(() => {
    confirmDialogStore.show({
      content: '确定退出节点吗？',
      okText: '确定',
      isDangerous: true,
      ok: async () => {
        ipcRenderer.send('disable-app-quit-prompt');
        confirmDialogStore.setLoading(true);
        await sleep(800);
        confirmDialogStore.hide();
        await sleep(400);
        await exitNode();
        nodeStore.setStoragePath('');
        await sleep(300);
        window.location.reload();
      },
    });
  }, []);

  const handleChangeExternalNodeSetting = async () => {
    const status = await setExternalNodeSetting();
    if (status === 'closed') {
      return;
    }
    snackbarStore.show({
      message: '设置成功',
    });
    await sleep(1000);
    window.location.reload();
  };

  return (
    <div className="bg-white rounded-12 p-8">
      <div className="w-70">
        <div className="text-18 font-bold text-gray-700 text-center">
          我的节点
        </div>
        <div className="mt-6">
          <div className="text-gray-500 font-bold opacity-90">ID</div>
          <div className="flex mt-1">
            <div className="p-2 pl-3 border border-gray-200 text-gray-500 bg-gray-100 text-12 truncate flex-1 rounded-l-12 border-r-0">
              <MiddleTruncate
                string={nodeStore.info.node_id}
                length={13}
              />
            </div>
            <Button
              noRound
              className="rounded-r-12"
              size="small"
              onClick={() => {
                copy(nodeStore.info.node_id);
                snackbarStore.show({
                  message: '已复制',
                });
              }}
            >
              复制
            </Button>
          </div>
        </div>
        {nodeStore.mode === 'EXTERNAL' && (
          <div className="mt-6">
            <div className="text-gray-500 font-bold opacity-90">开发节点</div>
            <div className="flex mt-1">
              <div className="p-2 pl-3 border border-gray-200 text-gray-500 text-12 truncate flex-1 rounded-l-12 border-r-0 tracking-wider">
                {nodeStore.apiHost}:{nodeStore.port}
              </div>
              <Button
                noRound
                className="rounded-r-12"
                size="small"
                onClick={handleChangeExternalNodeSetting}
              >
                修改
              </Button>
            </div>
          </div>
        )}
        <div className="mt-6">
          <div className="text-gray-500 font-bold opacity-90">储存文件夹</div>
          <div className="mt-2 text-12 text-gray-500 bg-gray-100 border border-gray-200 rounded-10 py-2 px-4">
            <Tooltip
              placement="top"
              title={nodeStore.storagePath}
              arrow
              interactive
            >
              <div className="tracking-wide">
                {formatPath(nodeStore.storagePath, { truncateLength: 27 })}
              </div>
            </Tooltip>
          </div>
        </div>
        <div className="mt-6">
          <div className="text-gray-500 font-bold opacity-90">版本和状态</div>
          <div className="mt-2 flex items-center justify-center text-12 text-gray-500 bg-gray-100 border border-gray-200 rounded-10 py-2 px-4">
            <Tooltip
              placement="top"
              title={`quorum latest commit: ${
                nodeStore.info.node_version.split(' - ')[1]
              }`}
              interactive
              arrow
            >
              <div>版本 {ipcRenderer.sendSync('app-version')}</div>
            </Tooltip>
            <div className="px-4">|</div>
            <div
              className="flex items-center hover:font-bold cursor-pointer"
              onClick={() => { state.showNetworkInfoModal = true; }}
            >
              网络状态
              <GoChevronRight className="text-14 ml-[1px] opacity-90" />
            </div>
          </div>
        </div>
        {nodeStore.mode === 'INTERNAL' && (
          <div className="mt-8">
            <Button fullWidth color="red" outline onClick={onExitNode}>
              退出
            </Button>
          </div>
        )}
      </div>
      <NetworkInfoModal
        open={state.showNetworkInfoModal}
        onClose={() => { state.showNetworkInfoModal = false; }}
      />
    </div>
  );
});

export default observer((props: IProps) => (
  <Dialog
    open={props.open}
    onClose={() => props.onClose()}
    transitionDuration={{
      enter: 300,
    }}
  >
    <MyNodeInfo />
  </Dialog>
));
