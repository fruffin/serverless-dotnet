'use strict';

const BbPromise = require('bluebird');

module.exports = {
  validate() {
    let self = this;
    return new BbPromise(function (resolve, reject) {
      try {
        self.serverless.cli.log('[DotNet] Validating requirements');
        if (!self.serverless.service.custom || !self.serverless.service.custom.dotnetpacking) {
          return reject('No dotnetpacking was found under custom properties.');
        }
        self.pluginconfig = self.serverless.service.custom.dotnetpacking;
        self.getProjectPathIfExist(self);
        self.getProjectFileIfExist(self);
        if (!self.preDefinedProjectPath && !self.preDefinedProjectFile && !self.pluginconfig.projectfilter) {
          return reject('No filter for project was found in custom > dotnetpacking > projectfilter!');
        }
        self.serverless.cli.log('[DotNet] Requirements validated with success!');

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  },
  getProjectPathIfExist(self) {
    self.projectPath = '**';
    self.preDefinedProjectPath = false;
    if (self.pluginconfig.projectpath) {
      self.projectPath = self.pluginconfig.projectpath;
      self.preDefinedProjectPath = true;
      self.serverless.cli.log(`[DotNet] Using pre-defined project path: '${self.pluginconfig.projectpath}'`);
    }
  },
  getProjectFileIfExist(self) {
    self.projectFile = '*.csproj';
    self.preDefinedProjectFile = false;
    if (self.pluginconfig.projectfile) {
      self.projectFile = self.pluginconfig.projectfile;
      self.preDefinedProjectFile = true;
      if (!projectFile.includes('.csproj')) {
        self.projectFile = `${projectFile}.csproj`;
      }
      self.serverless.cli.log(`[DotNet] Using pre-defined project file: '${self.pluginconfig.projectFile}'`);
    }
  },
};
