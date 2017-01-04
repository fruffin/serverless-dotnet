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
    let servicePath = this.serverless.config.servicePath;
    let zipFileName = `${this.serverless.service.service}.zip`;

    const artifactFilePath = path.join(
      servicePath,
      '.serverless',
      zipFileName
    );

    const sourcePath = path.join(servicePath, 'bin/Release/netcoreapp1.0/publish/');

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

      files.forEach((filePath) => {
        const fullPath = path.resolve(
          sourcePath,
          filePath
        );

        const stats = fs.statSync(fullPath);

        if (!stats.isDirectory(fullPath)) {
          zip.append(fs.readFileSync(fullPath), {
            name: filePath,
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
