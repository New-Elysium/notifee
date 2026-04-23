const { withNotifeeAndroid } = require('./android');
const { withNotifeeIos } = require('./ios');
const { normalizeProps, validateProps } = require('./utils');

function withNotifee(config, props) {
  const normalizedProps = normalizeProps(config, props);
  validateProps(normalizedProps, props || {});

  let nextConfig = config;
  nextConfig = withNotifeeAndroid(nextConfig, normalizedProps);
  nextConfig = withNotifeeIos(nextConfig, normalizedProps);
  return nextConfig;
}

module.exports = withNotifee;
module.exports.default = withNotifee;
