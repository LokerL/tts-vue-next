/**
 * 主进程与渲染进程通信频道定义
 * Definition of communication channels between main process and rendering process
 */
import { ipc } from '@/utils/ipcRenderer';

const system = {
  getTitle: 'controller/system/getTitle',
};

const edge = {
  getVoices: 'controller/edge/getVoices',
  tts: 'controller/edge/tts',
};

export { ipc, system, edge };
