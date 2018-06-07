'use strict';

const BbPromise = require('bluebird');

const clean = require('./lib/clean');
const compile = require('./lib/compile');
const pack = require('./lib/pack');
const path = require('path');

class ServerlessDotNet {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    Object.assign(
      this,
      clean,
      compile,
      pack
    );

        this.servicePath = this.serverless.config.servicePath;
        this.customVars = this.serverless.variables.service.custom;
        if ((this.customVars) && (this.customVars.dotnet) && (this.customVars.dotnet.slndir)) {
            this.servicePath = path.join(this.serverless.config.servicePath, this.customVars.dotnet.slndir);
        }

    this.hooks = {
      'before:deploy:createDeploymentArtifacts': () => BbPromise.bind(this)
        .then(this.clean)
        .then(this.compile),
      'after:deploy:createDeploymentArtifacts': () => BbPromise.bind(this)
        .then(this.pack)
    };
  }
}

module.exports = ServerlessDotNet;