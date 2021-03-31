'use strict';

const { resolve } = require('bluebird');
const BbPromise = require('bluebird');
const program = require('child_process');

module.exports = {
  packing(skip) {
    if (skip) {
      return BbPromise.resolve(skip);
    }
    let self = this;
    if (self.pluginconfig.skippacking) {
      self.warn(`Skipping 'dotnet restore & packing' because 'Skip packing' is true`);
      return resolve();
    } else {
      if (!self.pluginconfig.configuration) {
        self.pluginconfig.configuration = 'Release';
      }
      return BbPromise.bind(this)
        .then(this.checkLambdaTool)
        .then(this.installLambdaTool)
        .then(this.runDotnetLambdaPackage);
    }
  },
  checkLambdaTool() {
    let self = this;
    self.info(`Checking if has 'amazon.lambda.tools' installed`);
    return self.programExec('dotnet tool list -g', false, (error, stdout) => {
      self.checkLambdaToolIsInstalled = stdout.includes('amazon.lambda.tools')
    });
  },
  installLambdaTool() {
    let self = this;
    if (self.checkLambdaToolIsInstalled) {
      self.info(`'amazon.lambda.tools' already installed`);
      return resolve();
    } else {
      self.info(`'amazon.lambda.tools' not found`);
      return self.programExec('dotnet tool install -g Amazon.Lambda.Tools', false, () => {
        self.info(`'amazon.lambda.tools' installed with success!`);
      });
    }
  },
  runDotnetLambdaPackage() {
    let self = this;
    var cmds = [];
    for (var lambdaFunctionName in self.functions)
    {
      var configuration = self.functions[lambdaFunctionName].configuration;
      if (!configuration)
      {
        configuration = self.pluginconfig.configuration;
      }

      let lambdaPkgCmd = `dotnet lambda package --configuration ${configuration} --project-location ${self.functions[lambdaFunctionName].projectPath}`;
      if (self.functions[lambdaFunctionName].outputPackage) {
        lambdaPkgCmd = `${lambdaPkgCmd} --output-package ${self.functions[lambdaFunctionName].outputPackage}`;
      }
      if (self.functions[lambdaFunctionName].additionalPackageCommands) {
        lambdaPkgCmd = `${lambdaPkgCmd} ${self.functions[lambdaFunctionName].additionalPackageCommands}`;
      }
      let cmdObj = {
        command: lambdaPkgCmd,
        lambdaFunctionName: lambdaFunctionName
      }
      cmds.push(cmdObj);
    }

    return BbPromise.each(cmds, (cmdObj) => 
    { return this.programExec(cmdObj.command, true, null, cmdObj.lambdaFunctionName)})
    .then(() => BbPromise.resolve())
    .catch((rejection) => BbPromise.reject(rejection));
  },
  programExec(command, printStdOut, callback, lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        let stdoutLimit = 200;
        if (!isNaN(self.pluginconfig.stdoutlimit))
        {
          stdoutLimit = self.pluginconfig.stdoutlimit;
        }
        let maxOutputBufferSize = 1024 * 100;
        if (!isNaN(self.pluginconfig.maxoutputbuffersize))
        {
          maxOutputBufferSize = self.pluginconfig.maxoutputbuffersize;
        }
        if (printStdOut) {
          self.info(
            lambdaFunctionName ?
            `[${lambdaFunctionName}] Executing command '${command}'` :
            `Executing command '${command}'`);
        }
        return program.exec(command, {maxBuffer: 1024 * maxOutputBufferSize}, (error, stdout, stderr) => {
          let stdoutTrimmed = self.tailFromString(stdout, stdoutLimit, self);
          if (error) {
            console.error(self.pluginconfig);
            console.error(self.functions);
            return reject(`Error:\n${error}\n\nStdOut:\n${stdoutTrimmed}\n\nStdErr:\n${stderr}`);
          }
          if (printStdOut) {
            self.info(stdoutTrimmed);
          }
          if (callback) {
            callback(error, stdout, stderr);
          }

          return resolve(stdoutTrimmed ? stdoutTrimmed : stderr);
        });
      } catch (err) {
        return reject(err);
      }
    });
  },
  tailFromString(stringToAnalyze, numberOfLines, selfLogger) {
    let outputArr = stringToAnalyze.split('\n');
    if (outputArr.length < numberOfLines)
    {
      return stringToAnalyze;
    }

    selfLogger.info(`Printing the last ${numberOfLines} lines of stdout:`);
    return outputArr.slice(-numberOfLines).join('\n');
  }
};
