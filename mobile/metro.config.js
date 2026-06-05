const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  fs: path.resolve(__dirname, "lib/shims/empty-node-module.js"),
  path: path.resolve(__dirname, "lib/shims/path-node-module.js"),
};

module.exports = config;
