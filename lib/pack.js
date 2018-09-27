'use strict';

const archiver = require('archiver');
const BbPromise = require('bluebird');
const path = require('path');
const fs = require('fs');
const glob = require('glob-all');

module.exports = {
  pack() {
    this.serverless.cli.log('Serverless DotNet: Pack');

    const patterns = ['**'];
    let servicePath = this.servicePath;
    let zipFileName = `${this.serverless.service.service}.zip`;

    const artifactFilePath = path.join(
      this.serverless.config.servicePath,
      '.serverless',
      zipFileName
    );

    const sourcePath = [
      path.join(servicePath, 'bin/Release/netcoreapp1.0/publish/'),
      path.join(servicePath, 'bin/Release/netcoreapp2.0/publish/'),
      path.join(servicePath, 'bin/Release/netcoreapp2.1/publish/')
    ].find(fs.existsSync);

    console.log(`Packaging application from '${sourcePath}' to '${artifactFilePath}'`);

    const zip = archiver.create('zip');

    this.serverless.utils.writeFileDir(artifactFilePath);

    const output = fs.createWriteStream(artifactFilePath);

    output.on('open', () => {
      zip.pipe(output);

      const files = glob.sync(patterns, {
        cwd: sourcePath,
        dot: true,
        silent: true,
        follow: true,
      });

      var generateFileName = function(path) {

          //see https://github.com/aws/aws-lambda-dotnet/blob/master/Libraries/src/Amazon.Lambda.Tools/DotNetCLIWrapper.cs
          const KNOWN_PLATFORM_DEPENDENCIES = [
            "runtimes/unix/lib/netstandard1.3/System.Data.SqlClient.dll",
            "runtimes/unix/lib/netstandard1.3/System.IO.Pipes.dll",
            "runtimes/unix/lib/netstandard1.3/System.Private.ServiceModel.dll"
          ];

          for(var c = 0; c < KNOWN_PLATFORM_DEPENDENCIES.length; c++) {
            if(path.endsWith(KNOWN_PLATFORM_DEPENDENCIES[c])) {
              return KNOWN_PLATFORM_DEPENDENCIES[c].substring(KNOWN_PLATFORM_DEPENDENCIES[c].lastIndexOf('/'), KNOWN_PLATFORM_DEPENDENCIES[c].length);
            }
          }

          return path;
      };

      files.forEach((filePath) => {
        const fullPath = path.resolve(
          sourcePath,
          filePath
        );

        const stats = fs.statSync(fullPath);

        if (!stats.isDirectory(fullPath)) {
          zip.append(fs.readFileSync(fullPath), {
            name: generateFileName(filePath),
            mode: stats.mode,
          });
        }
      });

      zip.finalize();
    });

    return new BbPromise((resolve, reject) => {
      output.on('close', () => resolve(artifactFilePath));
      zip.on('error', (err) => reject(err));
    });
  }
};
