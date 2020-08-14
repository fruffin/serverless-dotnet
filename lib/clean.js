'use strict';

const BbPromise = require('bluebird');
const rimraf = require('rimraf');
const glob = require("glob");

module.exports = {
  clean() {
    let self = this;
    return new BbPromise(function (resolve, reject) {
      try {
        // Search for all 
        self.serverless.cli.log('[DotNet] Removing all bin/obj folders from workspace');
        let cleanupPaths = glob.sync('**/*(bin|obj)', {ignore: '**/Serverless/**/*(bin|obj)'});
        cleanupPaths.forEach(function(path) {
          console.log('Removing directory ' + path);
          rimraf(path, function(error){
            if (error) {
              throw error;
            }
          });
        })
        self.serverless.cli.log('[DotNet] All bin/obj folders from workspace were removed with success');
        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  }
};
