// Adds a build number from CI so each build is newer than the last (Android versionCode, iOS buildNumber).
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: Number(process.env.VERSION_CODE || 1),
  },
  ios: {
    ...config.ios,
    buildNumber: String(process.env.VERSION_CODE || 1),
  },
});
