'use strict';

const BbPromise = require('bluebird');

const compile = require('./lib/compile');
const pack = require('./lib/pack');

class ServerlessDotNet {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    Object.assign(
      this,
      compile,
      pack
    );

    this.hooks = {
      'before:deploy:createDeploymentArtifacts': () => BbPromise.bind(this)
        .then(this.compile)
        .then(this.pack)
    };
  }
}

module.exports = ServerlessDotNet;
