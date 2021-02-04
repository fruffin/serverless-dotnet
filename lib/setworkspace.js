'use strict';

const BbPromise = require('bluebird');

module.exports = {
  setworkspace(skip) {
    if (skip) {
      return BbPromise.resolve(skip);
    }
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        self.info(`Current workspace: ${self.serverless.config.servicePath}`);
        if (self.pluginconfig.slnabsolutepath) {
          process.chdir(self.pluginconfig.slnabsolutepath);
          self.info(`Workspace was changed using absolute sln path to: '${process.cwd()}'`);
        } else if (self.pluginconfig.slnrelativepath) {
          process.chdir(self.pluginconfig.slnrelativepath);
          self.info(`Workspace was changed using relative sln path to: '${process.cwd()}'`);
        }

        return resolve(skip);
      } catch (err) {
        return reject(err);
      }
    });
  }
};
