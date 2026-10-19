// Adds a build number from CI so each APK has a higher versionCode than the last.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: Number(process.env.VERSION_CODE || 1),
  },
});
