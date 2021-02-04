'use strict';

const BbPromise = require('bluebird');
const rimraf = require('rimraf');
const glob = require("glob");

module.exports = {
  clean(skip) {
    if (skip) {
      return BbPromise.resolve(skip);
    }
    let self = this;
    return new BbPromise((resolve, reject) => {
      try {
        if (self.pluginconfig.skippacking) {
          self.info(`Skipping removing folders because 'Skip packing' is true`);
        } else {
          // Search for all 
          self.info('Removing all bin/obj folders from workspace');
          let cleanupPaths = glob.sync('**/*(bin|obj)', {ignore: '**/*(Serverless|node_modules)/**/*(bin|obj)'});
          cleanupPaths.forEach(function(path) {
            self.info('Removing directory ' + path);
            rimraf(path, function(error){
              if (error) {
                throw error;
              }
            });
          })
          self.info('All bin/obj folders from workspace were removed with success');
        }
        return resolve(skip);
      } catch (err) {
        return reject(err);
      }
    });
  }
};
