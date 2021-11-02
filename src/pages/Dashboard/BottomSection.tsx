import React from 'react';
import { observer, useLocalStore } from 'mobx-react-lite';
import { Tab, Tabs } from '@material-ui/core';
import { MdInfo } from 'react-icons/md';
import Button from 'components/Button';
import Balance from './Balance';
import Swap from './Swap';
import DeveloperKeyManager from './DeveloperKeyManager';
import { sleep, PrsAtm } from 'utils';
import { useStore } from 'store';
import Tooltip from '@material-ui/core/Tooltip';

export default observer(() => {
  const {
    modalStore,
    snackbarStore,
    confirmDialogStore,
    accountStore,
  } = useStore();
  const { isDeveloper } = accountStore;
  const state = useLocalStore(() => ({
    tab: isDeveloper ? 'developerKeyManager' : 'balance',
    refreshing: false,
    claiming: false,
    authOfficialRewarding: false,
  }));

  const claimReward = async () => {
    modalStore.verification.show({
      pass: async (privateKey: string, accountName: string) => {
        state.claiming = true;
        try {
          const resp: any = await PrsAtm.fetch({
            actions: ['producer', 'claimRewards'],
            args: [accountName, privateKey],
            minPending: 600,
          });
          console.log({ resp });
        } catch (err) {
          console.log(err.message);
          snackbarStore.show({
            message: '暂无收益可领取',
            type: 'error',
          });
        }
        state.claiming = false;
      },
    });
  };

  const authOfficialReward = () => {
    state.authOfficialRewarding = true;
    modalStore.verification.show({
      pass: (privateKey: string, accountName: string) => {
        (async () => {
          try {
            await PrsAtm.fetch({
              actions: ['atm', 'authOfficialReward'],
              args: [accountName, privateKey],
              minPending: 600,
            });
            confirmDialogStore.show({
              content: '设定自动领取收益成功。当您的 Mixin 账号收到 claim successed 提示信息，表示系统已自动发起收益申领，收益的最小发放值为 1 PRS，低于该值您将无法得到收益。可通过获取他人投票以提高自己的排名、换票增加抵押等方式来提升您的收益值。',
              okText: '我知道了',
              ok: () => {
                confirmDialogStore.hide();
              },
              cancelDisabled: true,
            });
          } catch (err) {
            console.log(err.message);
          }
          state.authOfficialRewarding = false;
        })();
      },
      cancel: () => {
        state.authOfficialRewarding = false;
      },
    });
  };

  return (
    <div className="bg-white rounded-12 text-gray-6d">
      <div className="relative pt-1">
        <Tabs
          className="pl-5"
          value={state.tab}
          onChange={(_e, tab) => {
            state.tab = tab;
          }}
        >
          {isDeveloper && <Tab value="developerKeyManager" label="API 管理" />}
          <Tab value="balance" label="流水账单" />
          {!isDeveloper && <Tab value="swap" label="兑换记录" />}
        </Tabs>
        <div className="absolute top-0 right-0 mt-2 mr-4 flex items-center pt-3-px">
          {(!isDeveloper || state.tab === 'balance') && (
            <div className="mr-5 text-gray-bd text-12 flex items-center mt-2-px">
              <MdInfo className="text-18 mr-1 text-gray-d8" />
              交易记录会在交易完成后的3-5分钟生成
            </div>
          )}
          {!isDeveloper && (
            <div className="mr-4">
              <Tooltip
                placement="top"
                title="当您的 Mixin 账号收到 claim successed 提示信息，表示系统已自动发起收益申领，收益的最小发放值为 1 PRS。"
                arrow
              >
                <div>
                  <Button
                    size="mini"
                    onClick={authOfficialReward}
                    isDoing={state.authOfficialRewarding}
                  >
                    自动领取
                  </Button>
                </div>
              </Tooltip>
            </div>
          )}
          {!isDeveloper && (
            <div className="mr-4">
              <Tooltip
                placement="top"
                title="领取收益（节点补贴）需要间隔 24 小时，点击左侧按钮设置自动领取"
                arrow
              >
                <div>
                  <Button
                    size="mini"
                    onClick={claimReward}
                    isDoing={state.claiming}
                  >
                    领取收益
                  </Button>
                </div>
              </Tooltip>
            </div>
          )}
          {!isDeveloper && (
            <Button
              size="mini"
              outline
              onClick={async () => {
                state.refreshing = true;
                await sleep(10);
                state.refreshing = false;
              }}
            >
              刷新
            </Button>
          )}
        </div>
      </div>
      {state.refreshing && <div className="h-42" />}
      {!state.refreshing && (
        <div>
          {state.tab === 'balance' && <Balance />}
          {state.tab === 'swap' && <Swap />}
          {state.tab === 'developerKeyManager' && <DeveloperKeyManager />}
        </div>
      )}
    </div>
  );
});
