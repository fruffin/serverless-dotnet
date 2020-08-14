# Serverless DotNet

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-dotnet-packing.svg)](https://www.npmjs.com/package/serverless-dotnet-packing)
[![license](https://img.shields.io/npm/l/serverless-dotnet-packing.svg)](https://www.npmjs.com/package/serverless-dotnet-packing)


A Serverless v1.0 plugin to build your C# lambda functions on deploy.  
Forked from [fruffin/serverless-dotnet](https://github.com/fruffin/serverless-dotnet).

This plugin is for you if you don't want to have to run `dotnet restore`, `dotnet lambda package` and add the package will be placed under the `package.artifact` automatically.

## Install

```
npm install serverless-dotnet-packing
```

Add the plugin to your `serverless.yml` file:

```yaml
plugins:
  - serverless-dotnet-packing
```

Additionally you must have at least one of the following properties under your `custom`:

### -projectpath
It will search recursively for the first `.csproj` inside of this path.  
Must be a relative path to the `.sln` root folder. 
```yaml
custom:
  dotnetpacking:
    projectpath: ${opt:dotnet-project-path, ''} 
```
It could be used combined with [project file](#-projectfile).  
It will override the [project filter](#-projectfilter).  
It will be filled by the plugin if the value is empty or null.

### -projectfile
It will search recursively for the first `.csproj` with this name under the `.sln` root path.  
The extension `.csproj` is optional.
```yaml
custom:
  dotnetpacking:
    projectfile: ${opt:dotnet-project-file, ''} 
```
It could be used combined with [project path](#-projectpath).  
It will override the [project filter](#-projectfilter).  
It will be filled by the plugin if the value is empty or null.

### -projectfilter
It will search recursively for the first `.csproj` under the `.sln` root path with this word inside of the `.csproj` content.
```yaml
custom:
  dotnetpacking:
    projectfilter: ${opt:dotnet-project-filter, 'AWSProjectType'}  
```
This example is using the property based on [AWS Lambda Global Tools](https://aws.amazon.com/blogs/developer/aws-lambda-net-core-2-1-support-released/).

## Customizable properties

### -configuration
The configuration to be used in the `dotnet lambda package` command. 
```yaml
custom:
  dotnetpacking:
    configuration: ${opt:dotnet-configuration, 'Release'}
```
If nothing is passed, it will use `Release` internally.

### -slnabsolutepath
The absolute path for the `.sln` file.
```yaml
custom:
  dotnetpacking:
    slnabsolutepath: ${opt:dotnet-sln-absolute-path, ''}
```
If nothing is passed, it will consider the serverless path (serverless.yml folder).  
It overrides [relative path](#-slnrelativepath).

### -slnrelativepath
The relative path from the serverless path to the `.sln` root folder.
```yaml
custom:
  dotnetpacking:
    slnrelativepath: ${opt:dotnet-sln-relative-path, '..'}
```
If nothing is passed, it will consider the serverless path (serverless.yml folder).

### -outputpackage
The absolute, or relative path, to be used as the output for the package created by `dotnet lambda package`.  
Must include the package name with the zip extension.
```yaml
custom:
  dotnetpacking:
    outputpackage: ${opt:dotnet-outputpackage, 'package.zip'}
```
If nothing is passed, it will use the default parameters from the command (`<PROJECT_FOLDER>/bin/<CONFIGURATION>/<DOTNET_RUNTIME>/<PROJECT_FOLDER>.zip`).

## Properties filled by this plugin

### -projectruntime
Currently getting this information from `<TargetFramework>` property in the `.csproj` file.
```yaml
custom:
  dotnetpacking:
    projectruntime: ${opt:dotnet-project-runtime, ''} 
```
It should be used manually `${self:custom.dotnetpacking.projectruntime}`.

### -entrypointclass
Currently using the class name of the first `.cs` file that has a reference for `Amazon.Lambda.AspNetCoreServer` under the [project path](#-projectpath).
```yaml
custom:
  dotnetpacking:
    entrypointclass: ${opt:dotnet-entrypoint-class, ''}
```
It should be used manually `${self:custom.dotnetpacking.entrypointclass}`.

### -namespace
Currently using the namespace extracted from [entrypoint class file](#-entrypointclass).
```yaml
custom:
  dotnetpacking:
    namespace: ${opt:dotnet-namespace, ''}
```
It should be used manually `${self:custom.dotnetpacking.namespace}`.

### -assemblyname
Currently using the [project file](#-projectfile) without the `.csproj`.
```yaml
custom:
  dotnetpacking:
    assemblyname: ${opt:dotnet-assembly-name, ''}
```
It should be used manually `${self:custom.dotnetpacking.assemblyname}`.

## Notes

You can find a [simple `.yml` sample](sample.yml) under this repository.