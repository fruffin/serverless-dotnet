'use strict';

const { resolve } = require('bluebird');
const BbPromise = require('bluebird');
const program = require('child_process');
const glob = require("glob");
const path = require('path');

module.exports = {
    setfunction() {
        return new BbPromise.bind(this)
            .then(this.addPackage)
            .then(this.setFunctionProperties);
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
                let zipPackage = glob.sync(zipPath, { ignore: '**/*(Serverless|node_modules)/**/*.zip', realpath: true })[0];
                if (!zipPackage) {
                    return reject(`No package was found using the path: '${zipPath}'`);
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
    setFunctionProperties() {
        let self = this;
        return new BbPromise((resolve, reject) => {
            try {
                self.serverless.cli.log('[DotNet] Setting properties for each lambda function');
                for (var lambdaFunction in self.serverless.service.functions) {
                    self.setRuntime(self, lambdaFunction);
                    self.setFunctionHandlerWithVars(self, lambdaFunction);
                }
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
            self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using pre-defined runtime '${JSON.stringify(lambdaFunction.runtime)}'`);
        } else {
            lambdaFunction.runtime = lambdaFunction.runtime.replace(runtimeVar, self.serverless.service.custom.dotnetpacking.projectruntime);
            self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using runtime '${lambdaFunction.runtime}'`);
        }
    },
    setFunctionHandlerWithVars(self, lambdaFunctionName) {
        let lambdaFunction = self.serverless.service.functions[lambdaFunctionName];
        let regex = new RegExp(/^([a-z0-9_-][a-z0-9._-]+)::([a-z0-9_-][a-z0-9._-]+)[.]([a-z0-9_-]+)::([a-z0-9_-]+)$/i);
        if (regex.test(lambdaFunction.handler)) {
            self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using pre-defined handler '${JSON.stringify(lambdaFunction.handler)}'`);
        } else {
            const assemblyNameVar = '$dotnetpacking.assemblyname';
            const namespaceVar = '$dotnetpacking.namespace';
            const entryPointClassVar = '$dotnetpacking.entrypointclass';
            const functionHandlerVar = '$dotnetpacking.functionhandler';
            let assemblyName = self.serverless.service.custom.dotnetpacking.assemblyname;
            let namespace = self.serverless.service.custom.dotnetpacking.namespace;
            let entryPointClass = self.serverless.service.custom.dotnetpacking.entrypointclass;
            let functionHandler = 'FunctionHandlerAsync';
            let replaceResult = self.replaceIfNeed(self, lambdaFunction, assemblyNameVar, assemblyName, lambdaFunctionName);
            replaceResult = self.replaceIfNeed(self, lambdaFunction, namespaceVar, namespace, lambdaFunctionName) || replaceResult;
            replaceResult = self.replaceIfNeed(self, lambdaFunction, entryPointClassVar, entryPointClass, lambdaFunctionName) || replaceResult;
            replaceResult = self.replaceIfNeed(self, lambdaFunction, functionHandlerVar, functionHandler, lambdaFunctionName) || replaceResult;
            if (!replaceResult) {
                self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] No variable was found and incorrect expected format for handler. Overwriting it...'`);
                lambdaFunction.handler = `${assemblyName}::${namespace}.${entryPointClass}::${functionHandler}`;
            }

            self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using handler '${lambdaFunction.handler}'`);
        }
    },
    setFunctionHandlerWithoutVars(self, lambdaFunctionName) {
        let lambdaFunction = self.serverless.service.functions[lambdaFunctionName];
        let regex = new RegExp(/^([a-z0-9_-][a-z0-9._-]+)::([a-z0-9_-][a-z0-9._-]+)[.]([a-z0-9_-]+)::([a-z0-9_-]+)$/i);
        if (regex.test(lambdaFunction.handler)) {
            self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using pre-defined handler '${JSON.stringify(lambdaFunction.handler)}'`);
        } else {
            let assemblyName = self.serverless.service.custom.dotnetpacking.assemblyname;
            let namespace = self.serverless.service.custom.dotnetpacking.namespace;
            let entryPointClass = self.serverless.service.custom.dotnetpacking.entrypointclass;
            let functionHandler = 'FunctionHandlerAsync';
            if (lambdaFunction.handler) {
                let handlerArr = lambdaFunction.handler.split('::');
                if (handlerArr.length == 3) {
                    if (handlerArr[0]) {
                        assemblyName = handlerArr[0];
                        self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using pre-defined handler assembly name '${JSON.stringify(assemblyName)}'`);
                    } else {
                        self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using handler assembly name '${assemblyName}'`);
                    }
                    if (handlerArr[1]) {
                        self.setNamespaceAndClass(self, handlerArr[1], namespace, entryPointClass, lambdaFunctionName);
                    }
                    if (handlerArr[2]) {
                        functionHandler = handlerArr[2];
                        self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using pre-defined handler function class '${JSON.stringify(functionHandler)}'`);
                    } else {
                        self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using handler function class '${functionHandler}'`);
                    }
                } else {
                    self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Handler was not in expected format '<assembyname>::<namespace>.<entrypointclass>::<functionhandler>'`);
                    self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Handler will be overwrited'`);
                }
            }
            lambdaFunction.handler = `${assemblyName}::${namespace}.${entryPointClass}::${functionHandler}`;
            self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using handler '${lambdaFunction.handler}'`);
        }
    },
    setNamespaceAndClass(self, namespaceString, namespace, entryPointClass, lambdaFunctionName) {
        let functionClassArr = namespaceString.split('.');
        let arrLength = functionClassArr.length;
        if (arrLength >= 2) {
            let tempNamespace = functionClassArr.slice(0, arrLength - 1).join('.');
            if (tempNamespace) {
                namespace = tempNamespace
                self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using pre-defined handler namespace class '${JSON.stringify(namespace)}'`);
            } else {
                self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using handler namespace class '${namespace}'`);
            }
            if (functionClassArr[arrLength - 1]) {
                entryPointClass = functionClassArr[arrLength - 1];
                self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using pre-defined handler entry point class '${JSON.stringify(entryPointClass)}'`);
            } else {
                self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Using handler entry point class '${entryPointClass}'`);
            }
        } else {
            self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Handler namespace and entry point class was not in expected format '<namespace>.<entrypointclass>'`);
            self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Handler namespace and entry point class will be overwrited'`);
        }
    },
    replaceIfNeed(self, lambdaFunction, nameVar, replaceStr, lambdaFunctionName) {
        if (lambdaFunction.handler.includes(nameVar)) {
            self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Replacing '${nameVar}' by '${replaceStr}'`);
            lambdaFunction.handler = lambdaFunction.handler.replace(nameVar, replaceStr);
            return true;
        }

        self.serverless.cli.log(`[DotNet][LambdaFunction-${lambdaFunctionName}] Variable '${nameVar}' not found. Keeping the current ${nameVar.split('.')[1]}`);
        return false;
    }
};
