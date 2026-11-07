/*
 * Copyright (c) 2016-present Invertase Limited
 */

/* eslint-disable */

const { resolve, join } = require('path');

const exclusionList = require('metro-config/src/defaults/exclusionList');

const rootDir = resolve(__dirname, '..');

// Escape a literal path for embedding in a RegExp. (The deprecated global
// `escape()` URL-encodes its input, which silently broke these patterns.)
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const config = {
  projectRoot: __dirname,
  resolver: {
    useWatchman: !process.env.TEAMCITY_VERSION,
    blocklist: exclusionList([
      /.*\/__fixtures__\/.*/,
      /.*\/template\/project\/node_modules\/react-native\/.*/,
      new RegExp(`^${escapeRegExp(resolve(rootDir, 'docs'))}\/.*$`),
      new RegExp(`^${escapeRegExp(resolve(rootDir, 'tests_react_native/ios'))}\/.*$`),
      new RegExp(`^${escapeRegExp(resolve(rootDir, 'tests_react_native/e2e'))}\/.*$`),
      new RegExp(`^${escapeRegExp(resolve(rootDir, 'tests_react_native/android'))}\/.*$`),
      new RegExp(`^${escapeRegExp(resolve(rootDir, 'tests_react_native/functions'))}\/.*$`),
    ]),
    extraNodeModules: new Proxy(
      {},
      {
        get: (target, name) => {
          if (typeof name !== 'string') {
            return target[name];
          }
          if (name === '@psync/notifee') {
            return join(__dirname, '../packages/react-native');
          }
          return join(__dirname, `node_modules/${name}`);
        },
      },
    ),
  },
  watchFolders: [resolve(__dirname, './../packages/react-native')],
};

module.exports = config;
