'use strict';

const BbPromise = require('bluebird');
const glob = require("glob");
const path = require('path');

module.exports = {
    setfunctions(skip) {
        if (skip) {
            return BbPromise.resolve(skip);
        }
        return BbPromise.bind(this)
            .then(this.setlambdafunctions);
    },
    setlambdafunctions() {
        let self = this;
        let promises = [];

        for (var lambdaFunctionName in self.serverless.service.functions) {
            promises.push(BbPromise
                .resolve(lambdaFunctionName)
                .bind(this)
                .then(this.addPackage)
                .then(this.setFunctionProperties));
        }
        return BbPromise.all(promises);
    },
    addPackage(lambdaFunctionName) {
        let self = this;
        return new BbPromise((resolve, reject) => {
            try {
                self.info(`[${lambdaFunctionName}] Adding package`);
                let zipPath = self.functions[lambdaFunctionName].outputPackage;
                if (!zipPath)
                {
                    zipPath = `${self.functions[lambdaFunctionName].projectPath}/**/${self.functions[lambdaFunctionName].projectPath}.zip`;
                }
                let zipPackage = glob.sync(zipPath, { ignore: '**/*(Serverless|node_modules)/**/*.zip', realpath: true })[0];
                if (!zipPackage) {
                    return reject(`[${lambdaFunctionName}] No package was found using the path: '${zipPath}'`);
                }
                
                self.info(`[${lambdaFunctionName}] Using package '${zipPackage}'`);
                if (!self.serverless.service.functions[lambdaFunctionName].package) {
                    self.serverless.service.functions[lambdaFunctionName].package = {}
                }
                self.serverless.service.functions[lambdaFunctionName].package.artifact = zipPackage;

                return resolve(lambdaFunctionName);
            } catch (err) {
                return reject(err);
            }
        });
    },
    setFunctionProperties(lambdaFunctionName) {
        let self = this;
        return new BbPromise((resolve, reject) => {
            try {
                self.info(`[${lambdaFunctionName}] Setting properties for lambda function`);
                self.setRuntime(self, lambdaFunctionName);
                self.setFunctionHandlerWithVars(self, lambdaFunctionName);
                return resolve();
            } catch (err) {
                return reject(err);
            }
        });
    },
    setRuntime(self, lambdaFunctionName) {
        const runtimeVar = '$dotnetpacking.projectruntime';
        let lambdaFunction = self.serverless.service.functions[lambdaFunctionName];
        if (lambdaFunction.runtime && !lambdaFunction.runtime.includes(runtimeVar)) {
            self.info(`[${lambdaFunctionName}] Using pre-defined runtime '${JSON.stringify(lambdaFunction.runtime)}'`);
        } else {
            lambdaFunction.runtime = lambdaFunction.runtime ?
                lambdaFunction.runtime.replace(runtimeVar, self.functions[lambdaFunctionName].projectRuntime) :
                self.functions[lambdaFunctionName].projectRuntime;
            self.info(`[${lambdaFunctionName}] Using runtime '${lambdaFunction.runtime}'`);
        }
    },
    setFunctionHandlerWithVars(self, lambdaFunctionName) {
        let lambdaFunction = self.serverless.service.functions[lambdaFunctionName];
        let regex = new RegExp(/^([a-z0-9_-][a-z0-9._-]+)::([a-z0-9_-][a-z0-9._-]+)[.]([a-z0-9_-]+)::([a-z0-9_-]+)$/i);
        if (regex.test(lambdaFunction.handler)) {
            self.info(`[${lambdaFunctionName}] Using pre-defined handler '${JSON.stringify(lambdaFunction.handler)}'`);
        } else {
            const assemblyNameVar = '$dotnetpacking.assemblyname';
            const namespaceVar = '$dotnetpacking.namespace';
            const entryPointClassVar = '$dotnetpacking.entrypointclass';
            const functionHandlerVar = '$dotnetpacking.functionhandler';
            let assemblyName = self.functions[lambdaFunctionName].assemblyName;
            let namespace = self.functions[lambdaFunctionName].namespace;
            let entryPointClass = self.functions[lambdaFunctionName].entryPointClass;
            let functionHandler = self.functions[lambdaFunctionName].functionHandler;
            let replaceResult = self.replaceIfNeed(self, lambdaFunction, assemblyNameVar, assemblyName, lambdaFunctionName);
            replaceResult = self.replaceIfNeed(self, lambdaFunction, namespaceVar, namespace, lambdaFunctionName) || replaceResult;
            replaceResult = self.replaceIfNeed(self, lambdaFunction, entryPointClassVar, entryPointClass, lambdaFunctionName) || replaceResult;
            replaceResult = self.replaceIfNeed(self, lambdaFunction, functionHandlerVar, functionHandler, lambdaFunctionName) || replaceResult;
            if (!replaceResult) {
                self.info(`[${lambdaFunctionName}] No variable was found. Overwriting it...'`);
                lambdaFunction.handler = `${assemblyName}::${namespace}.${entryPointClass}::${functionHandler}`;
            }

            self.info(`[${lambdaFunctionName}] Using handler '${lambdaFunction.handler}'`);
        }
    },
    replaceIfNeed(self, lambdaFunction, nameVar, replaceStr, lambdaFunctionName) {
        if (lambdaFunction.handler.includes(nameVar)) {
            self.info(`[${lambdaFunctionName}] Replacing '${nameVar}' by '${replaceStr}'`);
            lambdaFunction.handler = lambdaFunction.handler.replace(nameVar, replaceStr);
            return true;
        }

        self.info(`[${lambdaFunctionName}] Variable '${nameVar}' not found. Keeping the current ${nameVar.split('.')[1]}`);
        return false;
    }
};
