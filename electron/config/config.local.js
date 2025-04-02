'use strict';

/**
 * Development environment configuration, coverage config.default.js
 */
module.exports = () => {
  return {
    openDevTools: {
      mode: 'detach',
      activate: true,
    },
    jobs: {
      messageLog: false,
    },
  };
};
