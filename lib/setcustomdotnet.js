'use strict';

const BbPromise = require('bluebird');
const glob = require("glob");
const fs = require('fs');

module.exports = {
  setcustomdotnet(skip) {
    if (skip) {
      return BbPromise.resolve(skip);
    }
    return BbPromise.bind(this)
      .then(this.setProjectInfo);
  },
  setProjectInfo() {
    let self = this;
    return BbPromise.each(Object.keys(self.functions), (lambdaFunctionName) => {
      return BbPromise
        .resolve(lambdaFunctionName)
        .bind(this)
        .then(this.setProject)
        .then(this.setProjectRuntime)
        .then(this.setEntryPoint)
        .then(this.setAssemblyName)
        .then(this.setNamespace)
        .then(this.setFunctionHandler)
        .then(this.setOutputPackage)
        .then(this.setAdditionalPackageCommands);
    }).then(() => BbPromise.resolve())
    .catch((rejection) => BbPromise.reject(rejection));
  },
  setProject(lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.functions[lambdaFunctionName].preDefinedProjectPath && self.functions[lambdaFunctionName].preDefinedProjectFile) {
          self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].projectpath = self.functions[lambdaFunctionName].projectPath;
          self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].projectfile = self.functions[lambdaFunctionName].projectFile;
          return resolve(lambdaFunctionName);
        }

        let lamdbaProjectFound = self.functions[lambdaFunctionName].preDefinedProjectFilter ?
          self.searchAndSetProjectWithFilter(self, lambdaFunctionName) :
          self.searchAndSetProjectWithFile(self, lambdaFunctionName);

        if (lamdbaProjectFound) {
          if (self.functions[lambdaFunctionName].projectPath !== self.functions[lambdaFunctionName].projectFile && !self.functions[lambdaFunctionName].preDefinedProjectPath) {
            self.info(`[${lambdaFunctionName}] Using project path '${self.functions[lambdaFunctionName].projectPath}'`);
            self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].projectpath = self.functions[lambdaFunctionName].projectPath;
          }
          if (!self.functions[lambdaFunctionName].preDefinedProjectFile) {
            self.info(`[${lambdaFunctionName}] Using project file '${self.functions[lambdaFunctionName].projectFile}'`);
            self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].projectfile = self.functions[lambdaFunctionName].projectFile;
          }
        } else {
          return reject(`[${lambdaFunctionName}] No lambda project was found for filter '${self.functions[lambdaFunctionName].projectFilter}'.`);
        }
        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  },
  searchAndSetProjectWithFile(self, lambdaFunctionName) {
    let lamdbaProjectFound = false;
    self.info(`[${lambdaFunctionName}] Searching project based on file under structure '${self.functions[lambdaFunctionName].projectPath}/${self.functions[lambdaFunctionName].projectFile}'`);
    let csprojs = glob.sync(`${self.functions[lambdaFunctionName].projectPath}/${self.functions[lambdaFunctionName].projectFile}`, { ignore: '**/Serverless/**/*.csproj' });
    if (csprojs) {
      let strArr = csprojs[0].split('/');
      self.functions[lambdaFunctionName].projectPath = strArr.slice(0, -1).join('/');
      self.functions[lambdaFunctionName].projectFile = strArr[strArr.length - 1];
      lamdbaProjectFound = true;
    }
    return lamdbaProjectFound;
  },
  searchAndSetProjectWithFilter(self, lambdaFunctionName) {
    let lamdbaProjectFound = false;
    self.info(`[${lambdaFunctionName}] Searching project based on filter: '${self.functions[lambdaFunctionName].projectFilter}' under structure '${self.functions[lambdaFunctionName].projectPath}/${self.functions[lambdaFunctionName].projectFile}'`);
    let csprojs = glob.sync(`${self.functions[lambdaFunctionName].projectPath}/${self.functions[lambdaFunctionName].projectFile}`, { ignore: '**/Serverless/**/*.csproj' });
    let csproj;
    if (csprojs.length > 0) {
      let projectFilter = self.functions[lambdaFunctionName].projectFilter;
      let uselambdanamefromproject = self.pluginconfig.uselambdanamefromproject || 
        self.pluginconfig.functions[lambdaFunctionName].uselambdanamefromproject;
      let regex = new RegExp(`<${projectFilter}>(.*)</${projectFilter}>`);
      if (!uselambdanamefromproject)
      {
        regex = new RegExp(`\\b${projectFilter}\\b`);
      }
      csprojs.some(file => {
        const fileContent = fs.readFileSync(file);
        let result = regex.exec(fileContent);
        if (result && (!uselambdanamefromproject ||
            result[1] == lambdaFunctionName)) {
            csproj = file;
            lamdbaProjectFound = true;
            return true;
        }
      });
    }
    if (csproj) {
      let strArr = csproj.split('/');
      self.functions[lambdaFunctionName].projectPath = strArr.slice(0, -1).join('/');
      self.functions[lambdaFunctionName].projectFile = strArr[strArr.length - 1];
    }
    return lamdbaProjectFound;
  },
  setProjectRuntime(lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.functions[lambdaFunctionName].projectruntime) {
          self.functions[lambdaFunctionName].projectRuntime = self.pluginconfig.functions[lambdaFunctionName].projectruntime;
          self.info(`[${lambdaFunctionName}] Using pre-defined runtime: '${JSON.stringify(self.pluginconfig.functions[lambdaFunctionName].projectruntime)}'`);
          return resolve(lambdaFunctionName);
        }
        if (self.pluginconfig.projectruntime) {
          self.functions[lambdaFunctionName].projectRuntime = self.pluginconfig.projectruntime;
          self.info(`[${lambdaFunctionName}] Using pre-defined general runtime: '${JSON.stringify(self.pluginconfig.projectruntime)}'`);
          return resolve(lambdaFunctionName);
        }

        const fileContent = fs.readFileSync(`${self.functions[lambdaFunctionName].projectPath}/${self.functions[lambdaFunctionName].projectFile}`);
        let regex = new RegExp('<TargetFramework>(.*)</TargetFramework>');
        let regexResult = fileContent.toString('utf8').match(regex);
        if (regexResult) {
          let runtime = `dot${regexResult[1].replace('app', '').replace('.0','')}`;
          self.info(`[${lambdaFunctionName}] Using runtime '${runtime}'`);
          self.functions[lambdaFunctionName].projectRuntime = runtime;
          self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].projectruntime = runtime;
        } else {
          return reject(`No target framework was found in project '${self.functions[lambdaFunctionName].projectPath}/${self.functions[lambdaFunctionName].projectFile}'.`);
        }

        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  },
  setAssemblyName(lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.functions[lambdaFunctionName].assemblyname) {
          self.functions[lambdaFunctionName].assemblyName = self.pluginconfig.functions[lambdaFunctionName].assemblyname;
          self.info(`[${lambdaFunctionName}] Using pre-defined assembly name: '${JSON.stringify(self.pluginconfig.functions[lambdaFunctionName].assemblyname)}'`);
        } else if (self.pluginconfig.assemblyname) {
          self.functions[lambdaFunctionName].assemblyName = self.pluginconfig.assemblyname;
          self.info(`[${lambdaFunctionName}] Using pre-defined general assembly name: '${JSON.stringify(self.pluginconfig.assemblyname)}'`);
        } else {
          let assemblyname = self.functions[lambdaFunctionName].projectFile.replace('.csproj', '');
          self.info(`[${lambdaFunctionName}] Using assembly name '${assemblyname}'`);
          self.functions[lambdaFunctionName].assemblyName = assemblyname;
          self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].assemblyname = assemblyname;
        }

        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  },
  setNamespace(lambdaFunctionName) {
    let self = this;

    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.functions[lambdaFunctionName].namespace) {
          self.functions[lambdaFunctionName].namespace = self.pluginconfig.functions[lambdaFunctionName].namespace;
          self.info(`[${lambdaFunctionName}] Using pre-defined namespace: '${JSON.stringify(self.pluginconfig.functions[lambdaFunctionName].namespace)}'`);
        } else if (self.pluginconfig.namespace) {
          self.functions[lambdaFunctionName].namespace = self.pluginconfig.namespace;
          self.info(`[${lambdaFunctionName}] Using pre-defined namespace: '${JSON.stringify(self.pluginconfig.namespace)}'`);
        } else {
          if (!self.functions[lambdaFunctionName].entryPointClassContent) {
            self.setEntrypointClassContent(self, lambdaFunctionName);
          }
          if (self.functions[lambdaFunctionName].entryPointClassContent) {
            let regex = new RegExp('namespace (.*)[\r\n]?');
            let regexResult = self.functions[lambdaFunctionName].entryPointClassContent.toString('utf8').match(regex);
            self.functions[lambdaFunctionName].entryPointClassContent = null;
            if (regexResult) {
              let namespace = regexResult[1].trim().replace(';', '');
              self.info(`[${lambdaFunctionName}] Using namespace ${namespace}`);
              self.functions[lambdaFunctionName].namespace = namespace;
              self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].namespace = namespace;
            }
          } else {
            return reject(`No class was found using 'Amazon.Lambda.AspNetCoreServer' under '${self.projectPath}'.`);
          }
        }

        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  },
  setEntryPoint(lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.functions[lambdaFunctionName].entrypointclass) {
          self.functions[lambdaFunctionName].entryPointClass = self.pluginconfig.functions[lambdaFunctionName].entrypointclass;
          self.info(`[${lambdaFunctionName}] Using pre-defined entrypoint class: '${JSON.stringify(self.pluginconfig.functions[lambdaFunctionName].entrypointclass)}'`);
        } else if (self.pluginconfig.entrypointclass) {
          self.functions[lambdaFunctionName].entryPointClass = self.pluginconfig.entrypointclass;
          self.info(`[${lambdaFunctionName}] Using pre-defined entrypoint class: '${JSON.stringify(self.pluginconfig.entrypointclass)}'`);
        } else {
          if (!self.functions[lambdaFunctionName].entryPointClass) {
            self.setEntrypointClassContent(self, lambdaFunctionName);
          }

          if (self.functions[lambdaFunctionName].entryPointClassContent) {
            let regex = new RegExp('class (.*):');
            let regexResult = self.functions[lambdaFunctionName].entryPointClassContent.toString('utf8').match(regex);
            self.functions[lambdaFunctionName].entryPointClassContent = null;
            if (regexResult) {
              let entryPointClass = regexResult[1].trim();
              self.info(`[${lambdaFunctionName}] Using entrypoint class '${entryPointClass}'`);
              self.serverless.service.custom.dotnetpacking.functions[lambdaFunctionName].entrypointclass = entryPointClass;
              self.functions[lambdaFunctionName].entryPointClass = entryPointClass;
            }
          } else {
            return reject(`No class was found using 'Amazon.Lambda.AspNetCoreServer' under '${self.functions[lambdaFunctionName].projectPath}'.`);
          }
        }

        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  },
  setEntrypointClassContent(self, lambdaFunctionName) {
    let csfiles = glob.sync(`${self.functions[lambdaFunctionName].projectPath}/**/*.cs`, { ignore: '**/Serverless/**/*.csproj' });
    csfiles.some(file => {
      const fileContent = fs.readFileSync(file);

      if ((self.functions[lambdaFunctionName].entryPointClass && 
        fileContent.includes(self.functions[lambdaFunctionName].entryPointClass)) ||
      // If a .cs file contains this namespace it is because the class extends APIGatewayProxyFunction or APIGatewayHttpApiV2ProxyFunction
      fileContent.includes('Amazon.Lambda.AspNetCoreServer')) {
        self.functions[lambdaFunctionName].entryPointClassContent = fileContent;
        return true;
      }
    });
  },
  setFunctionHandler(lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.functions[lambdaFunctionName].functionhandler) {
          self.functions[lambdaFunctionName].functionHandler = self.pluginconfig.functions[lambdaFunctionName].functionhandler;
          self.info(`[${lambdaFunctionName}] Using pre-defined function handler: '${JSON.stringify(self.pluginconfig.functions[lambdaFunctionName].functionhandler)}'`);
        } else if (self.pluginconfig.functionhandler) {
          self.functions[lambdaFunctionName].functionHandler = self.pluginconfig.functionhandler;
          self.info(`[${lambdaFunctionName}] Using pre-defined general function handler: '${JSON.stringify(self.pluginconfig.functionhandler)}'`);
        } else {
          self.functions[lambdaFunctionName].functionHandler = 'FunctionHandlerAsync';
          self.info(`[${lambdaFunctionName}] Using default function handler: 'FunctionHandlerAsync'`);
        }

        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  },
  setOutputPackage(lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.functions[lambdaFunctionName].outputpackage) {
          self.functions[lambdaFunctionName].outputPackage = self.pluginconfig.functions[lambdaFunctionName].outputpackage;
        } else if (self.pluginconfig.outputpackage) {
          self.functions[lambdaFunctionName].outputPackage = self.pluginconfig.outputpackage;
        }
        
        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  },
  setAdditionalPackageCommands(lambdaFunctionName) {
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.functions[lambdaFunctionName].additionalpackagecommands) {
          self.functions[lambdaFunctionName].additionalPackageCommands = self.pluginconfig.functions[lambdaFunctionName].additionalpackagecommands;
        } else if (self.pluginconfig.additionalpackagecommands) {
          self.functions[lambdaFunctionName].additionalPackageCommands = self.pluginconfig.additionalpackagecommands;
        }
        
        return resolve(lambdaFunctionName);
      } catch (err) {
        return reject(err);
      }
    });
  }
};
