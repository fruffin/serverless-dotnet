'use strict';

const BbPromise = require('bluebird');
const program = require('child_process');
const glob = require("glob");
const path = require('path');

module.exports = {
  pack() {
    let self = this;
    if (!self.pluginconfig.configuration) {
      self.pluginconfig.configuration = 'Release';
    }
    return new BbPromise.bind(this)
              .then(this.runDotnetRestore)
              .then(this.installLambdaToolIfNeeds)
              .then(this.runDotnetLambdaPackage)
              .then(this.addPackage);
  },
  runDotnetRestore() {
    return this.programExec('dotnet restore', true);
  },
  installLambdaToolIfNeeds() {
    let self = this;
    return self.programExec('dotnet tool list -g', false, (error, stdout) => {
      if (!stdout.includes('amazon.lambda.tools')) {
        console.warn('amazon.lambda.tools not found');
        return self.programExec('dotnet tool install -g Amazon.Lambda.Tools', false);
      }
    });
  },
  runDotnetLambdaPackage() {
    let self = this;
    let lambdaPkgCmd = `dotnet lambda package --configuration ${self.pluginconfig.configuration} --project-location ${self.pluginconfig.projectpath}`;
    if (self.pluginconfig.outputpackage) {
      lambdaPkgCmd = `${lambdaPkgCmd} --output-package ${self.pluginconfig.outputpackage}`;
    }

    return self.programExec(lambdaPkgCmd, true);
  },
  addPackage() {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        self.serverless.cli.log('[DotNet] Adding package');
        let zipPath = `${self.pluginconfig.projectpath}/**/${self.pluginconfig.projectpath}.zip`;
        if (self.pluginconfig.outputpackage) {
          zipPath = self.pluginconfig.outputpackage;
        }
        let zipPackage = glob.sync(zipPath, {ignore: '**/Serverless/**/*.zip', realpath: true})[0];
        if (!zipPackage) {
          return reject(`No package was found using the path: '${zipPackage}'`);
        }
        self.serverless.cli.log(`[DotNet] Using package '${zipPackage}'`);        
        let packageFile = path.relative(self.serverless.config.servicePath, zipPackage);
        self.serverless.cli.log(`[DotNet] Using relative path '${packageFile}'`);
        self.serverless.service.package.artifact = packageFile;

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  },
  programExec(command, printStdOut, callback) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (printStdOut) {
          self.serverless.cli.log(`[DotNet] Executing command '${command}'`);
        }
        return program.exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(error);
            return reject(error);
          }
          if (printStdOut) {
            console.log(stdout);
          }
          if (callback) {
            callback(error, stdout, stderr);
          }

          return resolve(stdout? stdout : stderr);
        });
      } catch (err) {
        return reject(err);
      }
    });
  }
};
