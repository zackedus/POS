// Monorepo: limit Metro watches to mobile deps only (not apps/web .next).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Expo auto-adds every workspace package (apps/web, apps/api, …). Drop sibling apps.
const mobileWatchFolders = [
  path.join(workspaceRoot, 'node_modules'),
  path.join(workspaceRoot, 'packages', 'shared'),
];

config.watchFolders = mobileWatchFolders;

// Ignore build/cache dirs if they appear under watched trees.
const blockPatterns = [
  /[/\\]\.next[/\\].*/,
  /[/\\]dist[/\\].*/,
  /[/\\]\.turbo[/\\].*/,
  /[/\\]coverage[/\\].*/,
  /[/\\]android[/\\]build[/\\].*/,
  /[/\\]ios[/\\]build[/\\].*/,
];

config.resolver = {
  ...config.resolver,
  blockList: exclusionList(blockPatterns),
};

module.exports = config;
