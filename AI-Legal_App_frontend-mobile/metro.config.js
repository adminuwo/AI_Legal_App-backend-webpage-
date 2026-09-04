const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react/compiler-runtime': require.resolve('react-compiler-runtime'),
};

module.exports = config;
