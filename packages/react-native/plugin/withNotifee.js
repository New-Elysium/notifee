const { withNotifeeAndroid } = require('./android');
const { withNotifeeIos } = require('./ios');
const { normalizeProps, validateProps, warn } = require('./utils');

/**
 * EAS syncs Apple credentials before prebuild runs and only registers app groups
 * declared in app.json `ios.entitlements` — it cannot see groups injected by
 * third-party plugins. If the extension is enabled and the resolved app group is
 * not declared, the provisioning profile will not contain it and codesigning
 * fails. Warn at prebuild time instead of deep into an EAS build.
 */
function warnIfAppGroupNotDeclared(config, props) {
  if (!props.enableNotificationServiceExtension || !props.appGroupName) {
    return;
  }

  const declaredGroups = config.ios?.entitlements?.['com.apple.security.application-groups'];
  if (Array.isArray(declaredGroups) && declaredGroups.includes(props.appGroupName)) {
    return;
  }

  warn(
    `App group "${props.appGroupName}" is not declared in app.json ` +
      `ios.entitlements["com.apple.security.application-groups"]. EAS only registers ` +
      `groups declared there; your iOS build may fail with a provisioning profile ` +
      `App Group mismatch.`,
  );
}

function withNotifee(config, props) {
  const normalizedProps = normalizeProps(config, props);
  validateProps(normalizedProps, props || {});
  warnIfAppGroupNotDeclared(config, normalizedProps);

  let nextConfig = config;
  nextConfig = withNotifeeAndroid(nextConfig, normalizedProps);
  nextConfig = withNotifeeIos(nextConfig, normalizedProps);
  return nextConfig;
}

module.exports = withNotifee;
module.exports.default = withNotifee;
