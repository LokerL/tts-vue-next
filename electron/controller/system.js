const { getConfig } = require('ee-core/config');

/**
 * 系统配置
 * @class
 */
class SystemController {
  async getTitle() {
    const { windowsOption } = getConfig();
    return windowsOption.title;
  }
}

SystemController.toString = () => '[class ExampleController]';

module.exports = SystemController;
