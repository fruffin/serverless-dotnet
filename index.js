'use strict';

const BbPromise = require('bluebird');

const validate = require('./lib/validate');
const setworkspace = require('./lib/setworkspace');
const clean = require('./lib/clean');
const setcustomdotnet = require('./lib/setcustomdotnet');
const pack = require('./lib/pack');

class ServerlessDotNet {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    
    Object.assign(
      this,
      validate,
      setworkspace,
      clean,
      setcustomdotnet,
      pack
    );

    this.hooks = {
      'before:package:createDeploymentArtifacts': 
        () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.setworkspace)
        .then(this.clean)
        .then(this.setcustomdotnet)
        .then(this.pack)
    };
  }
}

module.exports = ServerlessDotNet;
