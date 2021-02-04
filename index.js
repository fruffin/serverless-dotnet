'use strict';

const BbPromise = require('bluebird');

const validate = require('./lib/validate');
const setworkspace = require('./lib/setworkspace');
const clean = require('./lib/clean');
const setcustomdotnet = require('./lib/setcustomdotnet');
const packing = require('./lib/packing');
const setfunction = require('./lib/setfunctions');
const log = require('./helpers/logutils');

class ServerlessDotNet {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    
    Object.assign(
      this,
      log,
      validate,
      setworkspace,
      clean,
      setcustomdotnet,
      packing,
      setfunction
    );

    this.hooks = {
      'before:package:createDeploymentArtifacts': 
        () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.setworkspace)
        .then(this.clean)
        .then(this.setcustomdotnet)
        .then(this.packing)
        .then(this.setfunctions)
    };
  }
}

module.exports = ServerlessDotNet;
