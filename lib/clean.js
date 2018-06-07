'use strict';

const BbPromise = require('bluebird');
const path = require('path');
const rimraf = require('rimraf');

module.exports = {
  clean() {
    this.serverless.cli.log('Serverless DotNet: Clean');

    let cleanupPaths = [
        path.join(this.servicePath,'bin'),
        path.join(this.servicePath,'obj')
    ];

    return new BbPromise(function (resolve, reject) {
      try {
        cleanupPaths.forEach(function(path) {
          console.log('Removing directory ' + path);
          rimraf(path, function(error){
            if (error) {
              throw error;
            }
          });
        })

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  }
};
