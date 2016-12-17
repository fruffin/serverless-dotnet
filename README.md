# Serverless DotNet

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-dotnet.svg)](https://badge.fury.io/js/serverless-dotnet)
[![license](https://img.shields.io/npm/l/serverless-dotnet.svg)](https://www.npmjs.com/package/serverless-dotnet)

A Serverless v1.0 plugin to build your C# lambda functions on deploy.

This plugin is for you if you don't want to have to run `dotnet restore`, `dotnet publish` and zip the output manually every time you want to deploy.

## Install

```
npm install serverless-dotnet
```

Add the plugin to your `serverless.yml` file:

```yaml
plugins:
  - serverless-dotnet
```

And that's all there is to it. From this point, `dotnet restore` and `dotnet publish` will run as part of each `serverless deploy` run and the output will be zipped into the `.serverless` folder of your service, as it would for other runtimes.

## Note
If you are using the `aws-csharp` service template, you will need to remove the following line from your `serverless.yml` file as these are not needed any more:
```
package:
 artifact: bin/Release/netcoreapp1.0/publish/deploy-package.zip
```
