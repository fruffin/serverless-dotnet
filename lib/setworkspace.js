'use strict';

const BbPromise = require('bluebird');

module.exports = {
  setworkspace() {
    let self = this;
    return new BbPromise(function (resolve, reject) {
      try {
        self.serverless.cli.log(`[DotNet] Current workspace: ${self.serverless.config.servicePath}`);
        if (self.pluginconfig.slnabsolutepath) {
          process.chdir(self.pluginconfig.slnabsolutepath);
          self.serverless.cli.log(`[DotNet] Workspace was changed using absolute sln path to: '${process.cwd()}'`);
        } else if (self.pluginconfig.slnrelativepath) {
          process.chdir(self.pluginconfig.slnrelativepath);
          self.serverless.cli.log(`[DotNet] Workspace was changed using relative sln path to: '${process.cwd()}'`);
        }

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  }
};
