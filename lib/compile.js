'use strict';

const BbPromise = require('bluebird');
const path = require('path');
const program = require('child_process');

module.exports = {
  compile() {
    let servicePath = this.serverless.config.servicePath;
    this.serverless.cli.log('Serverless DotNet: Compile');

    this.serverless.cli.log(this.serverless.config.servicePath)

    const configuration = this.configuration;

    return new BbPromise(function (resolve, reject) {
      try {
        console.log('Restoring packages for ' + servicePath);

        program.exec('dotnet restore ' + servicePath, function(error, stdout, stderr){
          console.log(stdout);

          if (error) {
            console.log('An error occured while restoring packages');
            console.log(stderr);
            return reject(error);
          }

          console.log('Publishing');
          program.exec(`dotnet publish ${servicePath} -c ${configuration} /p:GenerateRuntimeConfigurationFiles=true`, function(error, stdout, stderr){
            console.log(stdout);

            if (error) {
              console.log('An error occured while restoring packages');
              console.log(stderr);
              return reject(error);
            }
            return resolve();
          });
        });
      } catch (err) {
        return reject(err);
      }
    });
  }
};
