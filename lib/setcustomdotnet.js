'use strict';

const BbPromise = require('bluebird');
const glob = require("glob");
const fs = require('fs');

module.exports = {
  setcustomdotnet() {
    return new BbPromise.bind(this)
              .then(this.setProjectInfo)
              .then(this.setProjectRuntime)
              .then(this.setAssemblyName)
              .then(this.setNamespace)
              .then(this.setEntryPoint);
  },

  setProjectInfo() {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {        
        let lamdbaProjectFound = self.searchAndSetProject(self);

        if (lamdbaProjectFound) {
          if (self.projectPath !== self.projectFile && !self.preDefinedProjectPath) {
            self.serverless.cli.log(`[DotNet] Using project path '${self.projectPath}'`);
            self.serverless.service.custom.dotnetpacking.projectpath = self.projectPath;
          }
          if (!self.preDefinedProjectFile) {
            self.serverless.cli.log(`[DotNet] Using project file '${self.projectFile}'`);
            self.serverless.service.custom.dotnetpacking.projectfile = self.projectFile;
          }
        } else {
            return reject(`No lambda project was found for filter '${self.pluginconfig.projectfilter}'.`);
        }

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  },
  searchAndSetProject(self){
    let lamdbaProjectFound = false;
    self.serverless.cli.log(`[DotNet] Searching project based on filter: '${self.pluginconfig.projectfilter}' under structure '${self.projectPath}/${self.projectFile}'`);
    let csprojs = glob.sync(`${self.projectPath}/${self.projectFile}`, {ignore: '**/Serverless/**/*.csproj'});
    let csproj;
    if (csprojs.length > 1) {
      let regex = new RegExp('\\b' + self.pluginconfig.projectfilter + '\\b');
      csprojs.forEach(file => {
          const fileContent = fs.readFileSync(file);
          if (regex.test(fileContent)) {
              csproj = file;
              lamdbaProjectFound = true;
              return false;
          }
      });
    }
    let strArr = csproj.split('/');
    self.projectPath = strArr.length > 1 ? strArr[strArr.length - 2] : strArr[0];
    self.projectFile = strArr[strArr.length - 1];
    return lamdbaProjectFound;
  },
  setProjectRuntime() {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        const fileContent = fs.readFileSync(`${self.projectPath}/${self.projectFile}`);
        let regex = new RegExp('<TargetFramework>(.*)</TargetFramework>');
        let regexResult = fileContent.toString('utf8').match(regex);
        if (regexResult) {
            let runtime = `dot${regexResult[1].replace('app', '')}`;
            self.serverless.cli.log(`[DotNet] Using runtime '${runtime}'`);
            self.serverless.service.custom.dotnetpacking.projectruntime = runtime;
        } else {
            return reject(`No target framework was found in project '${self.projectPath}/${self.projectFile}'.`);
        }

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  },
  setAssemblyName() {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.assemblyname) {
          self.serverless.cli.log(`[DotNet] Using pre-defined assembly name: '${self.pluginconfig.assemblyname}'`);
        } else {
          let assemblyname = self.projectFile.replace('.csproj','');
          self.serverless.cli.log(`[DotNet] Using assembly name '${assemblyname}'`);
          self.serverless.service.custom.dotnetpacking.assemblyname = assemblyname;
        }

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  },
  setNamespace() {
    let self = this;
    
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.namespace) {
          self.serverless.cli.log(`[DotNet] Using pre-defined assembly name: '${self.pluginconfig.namespace}'`);
        } else {
          self.setEntrypointClassContent(self);

          if (self.entryPointClass) {
            let regex = new RegExp('namespace (.*)[\r\n]?');
            let regexResult = self.entryPointClass.toString('utf8').match(regex);
            if (regexResult) {
              let namespace = regexResult[1].trim();
              self.serverless.cli.log(`[DotNet] Using namespace ${namespace}`);
              self.serverless.service.custom.dotnetpacking.namespace = namespace;
            }
          } else {
            return reject(`No class was found using 'Amazon.Lambda.AspNetCoreServer' under '${self.projectPath}'.`);
          }
        }

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  },
  setEntryPoint() {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.entrypointclass) {
          self.serverless.cli.log(`[DotNet] Using pre-defined entrypoint class: '${self.pluginconfig.entrypointclass}'`);
        } else {
          if (!self.entryPointClass) {
            self.setEntrypointClassContent(self);
          }

          if (self.entryPointClass) {
            let regex = new RegExp('class (.*):');
            let regexResult = self.entryPointClass.toString('utf8').match(regex);
            if (regexResult) {
              let entryPointClass = regexResult[1].trim();
              self.serverless.cli.log(`[DotNet] Using entrypoint class '${entryPointClass}'`);
              self.serverless.service.custom.dotnetpacking.entrypointclass = entryPointClass;
            }
          } else {
            return reject(`No class was found using 'Amazon.Lambda.AspNetCoreServer' under '${self.projectPath}'.`);
          }
        }

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  },
  setEntrypointClassContent(self) {
    let csfiles = glob.sync(`${self.projectPath}/**/*.cs`, {ignore: '**/Serverless/**/*.csproj'});
    csfiles.forEach(file => {
        const fileContent = fs.readFileSync(file);
        // If a .cs file contains this namespace it is because the class extends APIGatewayProxyFunction or APIGatewayHttpApiV2ProxyFunction
        if (fileContent.includes('Amazon.Lambda.AspNetCoreServer')) {
            self.entryPointClass = fileContent;
            return false;
        }
    });
  }
};
