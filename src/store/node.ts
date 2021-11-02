import { INodeInfo, INetwork, INetworkGroup } from 'apis/group';
import { ProcessStatus } from 'utils/quorum';
import cryptoRandomString from 'crypto-random-string';
import { isDevelopment } from 'utils/env';
import externalNodeMode from 'utils/storages/externalNodeMode';
import { BOOTSTRAPS } from 'utils/constant';

const STORAGE_NODE_MODE = 'NODE_MODE';
const STORAGE_NODE_PORT = 'NODE_PORT';
const STORAGE_NODE_PEER_NAME = 'NODE_PEER_NAME';

type NODE_MODE = 'INTERNAL' | 'EXTERNAL' | '';

export function createNodeStore() {
  return {
    connected: false,

    port: 0,

    status: <ProcessStatus>{},

    info: {} as INodeInfo,

    network: {} as INetwork,

    mode: (localStorage.getItem(STORAGE_NODE_MODE) || '') as NODE_MODE,

    canUseExternalMode: externalNodeMode.enabled() || isDevelopment,

    get groupNetworkMap() {
      const map = {} as { [key: string]: INetworkGroup };
      for (const groupNetwork of this.network.groups || []) {
        map[groupNetwork.GroupId] = groupNetwork;
      }
      return map;
    },

    get disconnected() {
      return false;
    },

    get config() {
      let peerName = localStorage.getItem(STORAGE_NODE_PEER_NAME);
      if (!peerName) {
        peerName = `peer_${cryptoRandomString(10)}`;
        localStorage.setItem(STORAGE_NODE_PEER_NAME, peerName);
      }
      return {
        type: 'process',
        peername: peerName,
        host: BOOTSTRAPS[0].host,
        bootstrapId: BOOTSTRAPS[0].id,
      };
    },

    getPortFromStorage() {
      return Number(localStorage.getItem(STORAGE_NODE_PORT) || 0);
    },

    resetPeerName() {
      localStorage.removeItem(STORAGE_NODE_PEER_NAME);
      this.port = 0;
    },

    resetPort() {
      localStorage.removeItem(STORAGE_NODE_PORT);
      this.port = 0;
    },

    setConnected(value: boolean) {
      this.connected = value;
    },

    setStatus(ProcessStatus: ProcessStatus) {
      this.status = ProcessStatus;
      this.setPort(this.status.port);
    },

    setPort(port: number) {
      this.port = port;
      localStorage.setItem(STORAGE_NODE_PORT, String(port));
    },

    setMode(mode: NODE_MODE) {
      this.mode = mode;
      localStorage.setItem(STORAGE_NODE_MODE, mode);
    },

    setInfo(info: INodeInfo) {
      this.info = info;
    },

    setNetwork(network: INetwork) {
      this.network = network;
    },

    updateStatus(status: string) {
      this.info.node_status = status;
    },
  };
}