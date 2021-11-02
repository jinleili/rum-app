const path = require('path');
const fs = require('fs');
const util = require('util');
const child_process = require('child_process');
const { app, ipcMain } = require('electron');
const log = require('electron-log');
const getPort = require('get-port');
const pmkdir = util.promisify(fs.mkdir);


const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = !isDevelopment;

const state = {
  type: 'process',
  forwading: false,
  process: null,
  port: 0,
  host: '',
  bootstrapId: '',
  logs: '',

  get up() {
    if (state.type === 'process') {
      return !!this.process;
    }
    return state.forwading;
  },
};

const actions = {
  status() {
    return {
      up: state.up,
      bootstrapId: state.bootstrapId,
      host: state.host,
      port: state.port,
      logs: state.logs,
    };
  },
  async up(param) {
    if (param.type === 'forward') {
      if (state.up) {
        return this.status();
      }
      state.type = param.type;
      state.port = param.port;
      state.logs = '';
      state.host = '';
      state.bootstrapId = '';
      state.forwading = true;
    }

    if (param.type === 'process') {
      if (state.up) {
        return this.status();
      }
      const { peername, host, bootstrapId } = param;

      const quorumFileName = {
        linux: 'quorum_linux',
        darwin: 'quorum_darwin',
        win32: 'quorum_win.exe',
      };
      const quorumBaseDir = path.join(
        isProduction ? process.resourcesPath : app.getAppPath(),
        'quorum_bin',
      );
      const cmd = path.join(
        quorumBaseDir,
        quorumFileName[process.platform],
      );

      const peerPort = await getPort();
      const apiPort = await getPort();
      const args = [
        '-peername',
        peername,
        '-listen',
        `/ip4/0.0.0.0/tcp/${peerPort}`,
        '-apilisten',
        `:${apiPort}`,
        '-peer',
        `/ip4/${host}/tcp/10666/p2p/${bootstrapId}`,
        '-logtostderr=true',
        '-jsontracer',
        `${peername}.json`,
        '-debug',
        'true'
      ];

      // ensure config dir
      try {
        await pmkdir(path.join(quorumBaseDir, 'config'));
      } catch (err) {}

      state.type = param.type;
      state.logs = '';
      state.host = host;
      state.bootstrapId = bootstrapId;
      state.port = apiPort;
      state.forwading = false;

      const peerProcess = child_process.spawn(cmd, args, {
        cwd: quorumBaseDir,
      })
      state.process = peerProcess;

      const handleData = (data) => {
        state.logs += data;
        if (state.logs.length > 131072) {
          state.logs = state.logs.slice(131072 - state.logs.length);
        }
      }

      peerProcess.stdout.on('data', handleData);
      peerProcess.stderr.on('data', handleData);
      peerProcess.on('exit', () => {
        state.process = null;
      })
    }

    return this.status();
  },
  down() {
    if (!state.up) {
      return this.status();
    }
    if (state.type === 'process') {
      state.process.kill();
      state.process = null;
    }
    if (state.type === 'forward') {
      state.forwading = false;
    }
    return this.status();
  },
};

const initQuorum = () => {
  ipcMain.on('quorum', async (event, arg) => {
    try {
      const result = await actions[arg.action](arg.param);
      event.sender.send('quorum', {
        id: arg.id,
        data: result,
        error: null,
      });
    } catch (err) {
      console.log(err.message);
      if (!isDevelopment) {
        log.error(err);
      }
      event.sender.send('quorum', {
        id: arg.id,
        data: null,
        error: err.message,
      });
    }
  });
}

module.exports = {
  initQuorum,
};
