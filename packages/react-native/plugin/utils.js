const path = require('path');
const {
  DEFAULT_EXTENSION_NAME,
  DEFAULT_IOS_DEPLOYMENT_TARGET,
  PACKAGE_NAME,
  VALID_IOS_SOUND_EXTENSIONS,
} = require('./constants');

function throwPluginError(message) {
  throw new Error(`${PACKAGE_NAME}: ${message}`);
}

function log(message, verbose) {
  if (verbose) {
    console.log(`${PACKAGE_NAME}: ${message}`);
  }
}

function warn(message) {
  console.warn(`${PACKAGE_NAME}: ${message}`);
}

function isValidIOSSoundFileExtension(filePath) {
  return VALID_IOS_SOUND_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidAndroidResourceName(name) {
  // Must be a valid Java identifier too, since it becomes an R.drawable/R.raw
  // constant: no leading digit.
  return /^[a-z_][a-z0-9_]*$/.test(name);
}

function isValidAndroidColor(value) {
  // #RGB, #RGBA, #RRGGBB or #AARRGGBB — the formats Android color resources accept as literals.
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

function getExtensionConfig(options) {
  return isPlainObject(options.serviceExtensionSettings) ? options.serviceExtensionSettings : {};
}

function normalizeProps(config, props) {
  const options = props || {};
  const ios = config.ios || {};
  const extensionConfig = getExtensionConfig(options);
  const extensionName =
    extensionConfig.name || options.notificationServiceExtensionName || DEFAULT_EXTENSION_NAME;
  const bundleIdentifier = ios.bundleIdentifier || null;
  const appleDevTeamId = options.appleDevTeamId || ios.appleTeamId;
  const enableNotificationServiceExtension = options.enableNotificationServiceExtension === true;
  const extensionBundleIdentifier =
    extensionConfig.bundleIdentifier ||
    options.notificationServiceExtensionBundleIdentifier ||
    (bundleIdentifier ? `${bundleIdentifier}.${extensionName}` : null);
  const appGroupName =
    extensionConfig.appGroupName ||
    options.appGroupName ||
    (bundleIdentifier ? `group.${bundleIdentifier}` : null);

  return {
    androidNotificationColor: options.androidNotificationColor || null,
    androidNotificationIcon: options.androidNotificationIcon || null,
    apsEnvMode: options.apsEnvMode,
    androidIcons: options.androidIcons || [],
    androidSoundFiles: options.androidSoundFiles || [],
    appGroupName,
    appleDevTeamId,
    backgroundModes: options.backgroundModes,
    bundleIdentifier,
    customNotificationServiceFilePath:
      extensionConfig.customSourceFilePath || options.customNotificationServiceFilePath,
    enableCommunicationNotifications: options.enableCommunicationNotifications === true,
    enableNotificationServiceExtension,
    extensionBundleIdentifier,
    extensionEntitlements:
      extensionConfig.entitlements || options.notificationServiceExtensionEntitlements || {},
    extensionInfoPlist:
      extensionConfig.infoPlist || options.notificationServiceExtensionInfoPlist || {},
    extensionName,
    iosSoundFiles: options.iosSoundFiles || [],
    iosDeploymentTarget:
      extensionConfig.deploymentTarget ||
      options.iosDeploymentTarget ||
      ios.deploymentTarget ||
      DEFAULT_IOS_DEPLOYMENT_TARGET,
    verbose: options.verbose === true,
  };
}

function validateProps(normalizedProps, rawProps = {}) {
  const {
    androidIcons,
    androidNotificationColor,
    androidNotificationIcon,
    androidSoundFiles,
    apsEnvMode,
    appleDevTeamId,
    backgroundModes,
    bundleIdentifier,
    customNotificationServiceFilePath,
    enableNotificationServiceExtension,
    extensionBundleIdentifier,
    extensionEntitlements,
    extensionInfoPlist,
    iosSoundFiles,
    iosDeploymentTarget,
  } = normalizedProps;

  if (apsEnvMode !== undefined && apsEnvMode !== 'development' && apsEnvMode !== 'production') {
    throwPluginError("'apsEnvMode' must be either 'development' or 'production'.");
  }

  if (iosDeploymentTarget !== undefined && typeof iosDeploymentTarget !== 'string') {
    throwPluginError("'iosDeploymentTarget' must be a string.");
  }

  if (appleDevTeamId !== undefined && typeof appleDevTeamId !== 'string') {
    throwPluginError("'appleDevTeamId' must be a string.");
  }

  if (
    extensionBundleIdentifier !== undefined &&
    extensionBundleIdentifier !== null &&
    typeof extensionBundleIdentifier !== 'string'
  ) {
    throwPluginError("'notificationServiceExtensionBundleIdentifier' must be a string.");
  }

  if (backgroundModes !== undefined && !Array.isArray(backgroundModes)) {
    throwPluginError("'backgroundModes' must be an array of strings.");
  }

  if (backgroundModes !== undefined && !backgroundModes.every(mode => typeof mode === 'string')) {
    throwPluginError("'backgroundModes' must only contain strings.");
  }

  if (
    customNotificationServiceFilePath !== undefined &&
    typeof customNotificationServiceFilePath !== 'string'
  ) {
    throwPluginError("'customNotificationServiceFilePath' must be a string.");
  }

  if (!isPlainObject(extensionEntitlements)) {
    throwPluginError("'notificationServiceExtensionEntitlements' must be an object.");
  }

  if (!isPlainObject(extensionInfoPlist)) {
    throwPluginError("'notificationServiceExtensionInfoPlist' must be an object.");
  }

  if (!Array.isArray(iosSoundFiles)) {
    throwPluginError("'iosSoundFiles' must be an array of file paths.");
  }

  for (const soundPath of iosSoundFiles) {
    if (typeof soundPath !== 'string' || soundPath.length === 0) {
      throwPluginError("'iosSoundFiles' entries must be non-empty strings.");
    }

    if (!isValidIOSSoundFileExtension(soundPath)) {
      throwPluginError(
        `'iosSoundFiles' entry '${soundPath}' must use one of: ${VALID_IOS_SOUND_EXTENSIONS.join(', ')}.`,
      );
    }
  }

  if (
    androidNotificationColor !== undefined &&
    androidNotificationColor !== null &&
    (typeof androidNotificationColor !== 'string' || !isValidAndroidColor(androidNotificationColor))
  ) {
    throwPluginError(
      "'androidNotificationColor' must be a hex color string (e.g. '#ffffff' or '#ffffffff'), which is written to the 'notification_icon_color' Android color resource.",
    );
  }

  if (
    androidNotificationIcon !== undefined &&
    androidNotificationIcon !== null &&
    typeof androidNotificationIcon !== 'string'
  ) {
    throwPluginError("'androidNotificationIcon' must be a string file path.");
  }

  if (androidIcons !== undefined && !Array.isArray(androidIcons)) {
    throwPluginError("'androidIcons' must be an array.");
  }

  if (androidSoundFiles !== undefined && !Array.isArray(androidSoundFiles)) {
    throwPluginError("'androidSoundFiles' must be an array.");
  }

  for (const icon of androidIcons) {
    if (!icon || typeof icon !== 'object') {
      throwPluginError("Each entry in 'androidIcons' must be an object.");
    }

    if (typeof icon.name !== 'string' || icon.name.length === 0) {
      throwPluginError("Each Android icon must include a non-empty string 'name'.");
    }

    if (!isValidAndroidResourceName(icon.name)) {
      throwPluginError(
        `Android icon '${icon.name}' must use only lowercase letters, numbers, and underscores, because the name becomes the generated drawable resource name.`,
      );
    }

    if (typeof icon.path !== 'string' || icon.path.length === 0) {
      throwPluginError(`Android icon '${icon.name}' must include a non-empty string 'path'.`);
    }

    if (icon.type !== 'small' && icon.type !== 'large') {
      throwPluginError(`Android icon '${icon.name}' must have type 'small' or 'large'.`);
    }
  }

  for (const sound of androidSoundFiles) {
    if (!sound || typeof sound !== 'object') {
      throwPluginError("Each entry in 'androidSoundFiles' must be an object.");
    }

    if (typeof sound.name !== 'string' || sound.name.length === 0) {
      throwPluginError("Each Android sound must include a non-empty string 'name'.");
    }

    if (!isValidAndroidResourceName(sound.name)) {
      throwPluginError(
        `Android sound '${sound.name}' must use only lowercase letters, numbers, and underscores.`,
      );
    }

    if (typeof sound.path !== 'string' || sound.path.length === 0) {
      throwPluginError(`Android sound '${sound.name}' must include a non-empty string 'path'.`);
    }
  }

  if (enableNotificationServiceExtension && !bundleIdentifier) {
    throwPluginError(
      "iOS 'bundleIdentifier' must be defined in the Expo config when 'enableNotificationServiceExtension' is true.",
    );
  }

  if (
    rawProps.serviceExtensionSettings !== undefined &&
    !isPlainObject(rawProps.serviceExtensionSettings)
  ) {
    throwPluginError("'serviceExtensionSettings' must be an object when provided.");
  }

  if (rawProps.serviceExtensionSettings && 'enabled' in rawProps.serviceExtensionSettings) {
    throwPluginError(
      "'serviceExtensionSettings.enabled' is not supported. Enable the extension with the top-level 'enableNotificationServiceExtension: true' option.",
    );
  }

  if (rawProps.notificationServiceExtension !== undefined) {
    throwPluginError(
      "'notificationServiceExtension' has been renamed to 'serviceExtensionSettings'. Enable the extension with the top-level 'enableNotificationServiceExtension: true' option.",
    );
  }

  if (
    rawProps.notificationServiceExtensionName !== undefined &&
    typeof rawProps.notificationServiceExtensionName !== 'string'
  ) {
    throwPluginError("'notificationServiceExtensionName' must be a string when provided.");
  }
}

module.exports = {
  isPlainObject,
  isValidAndroidColor,
  isValidAndroidResourceName,
  log,
  normalizeProps,
  throwPluginError,
  validateProps,
  warn,
  isValidIOSSoundFileExtension,
};
