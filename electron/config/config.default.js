'use strict';

const path = require('path');
const { getBaseDir } = require('ee-core/ps');

/**
 * 默认配置
 */
module.exports = () => {
  return {
    openDevTools: false,
    singleLock: true,
    windowsOption: {
      title: 'tts-vue-next',
      width: 980,
      height: 650,
      minWidth: 400,
      minHeight: 300,
      autoHideMenuBar: true,
      webPreferences: {
        //webSecurity: false,
        contextIsolation: false, // false -> 可在渲染进程中使用electron的api，true->需要bridge.js(contextBridge)
        nodeIntegration: true,
        //preload: path.join(getElectronDir(), 'preload', 'bridge.js'),
      },
      frame: false,
      show: true,
      icon: path.join(getBaseDir(), 'public', 'images', 'logo-32.png'),
      titleBarStyle: 'hidden',
      ...(process.platform !== 'darwin'
        ? {
            titleBarOverlay: {
              color: 'rgba(0, 0, 0, 0)',
            },
          }
        : {}),
    },
    logger: {
      level: 'INFO',
      outputJSON: false,
      appLogName: 'ee.log',
      coreLogName: 'ee-core.log',
      errorLogName: 'ee-error.log',
    },
    socketServer: {
      enable: false,
      port: 7070,
      path: '/socket.io/',
      connectTimeout: 45000,
      pingTimeout: 30000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e8,
      transports: ['polling', 'websocket'],
      cors: {
        origin: true,
      },
      channel: 'socket-channel',
    },
    httpServer: {
      enable: false,
      https: {
        enable: false,
        key: '/public/ssl/localhost+1.key',
        cert: '/public/ssl/localhost+1.pem',
      },
      host: '127.0.0.1',
      port: 7071,
    },
    mainServer: {
      indexPath: '/public/dist/index.html',
      channelSeparator: '/',
    },
  };
};
