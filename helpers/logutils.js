'use strict';

module.exports = {
  info(message) {
    this.serverless.cli.log(message, "DotNetPacking");
  },
  warn(message) {
    this.serverless.cli.log(`[WARN] ${message}`, "DotNetPacking", {color: 'orange'});
  },
  error(message) {
    this.serverless.cli.log(`[ERROR] ${message}`, "DotNetPacking", {color: 'red'});
  }
};
