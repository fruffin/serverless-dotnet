'use strict';

const BbPromise = require('bluebird');

const clean = require('./lib/clean');
const compile = require('./lib/compile');
const pack = require('./lib/pack');

class ServerlessDotNet {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.configuration = this.options.hasOwnProperty('configuration') ?
    this.options.configuration :
    'Release';

    Object.assign(
      this,
      clean,
      compile,
      pack
    );

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
