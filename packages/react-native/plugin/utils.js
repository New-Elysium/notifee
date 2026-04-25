const path = require('path');
const {
  DEFAULT_BACKGROUND_MODES,
  DEFAULT_EXTENSION_NAME,
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

function normalizeProps(config, props) {
  const options = props || {};
  const ios = config.ios || {};
  const extensionName = options.notificationServiceExtensionName || DEFAULT_EXTENSION_NAME;
  const bundleIdentifier = ios.bundleIdentifier || null;
  const extensionBundleIdentifier = bundleIdentifier ? `${bundleIdentifier}.${extensionName}` : null;
  const appGroupName =
    options.appGroupName || (bundleIdentifier ? `group.${bundleIdentifier}.notifee` : null);

  return {
    apsEnvMode: options.apsEnvMode,
    androidIcons: options.androidIcons || [],
    appGroupName,
    appleDevTeamId: options.appleDevTeamId,
    backgroundModes:
      options.backgroundModes === undefined ? DEFAULT_BACKGROUND_MODES.slice() : options.backgroundModes,
    bundleIdentifier,
    customNotificationServiceFilePath: options.customNotificationServiceFilePath,
    enableCommunicationNotifications: options.enableCommunicationNotifications === true,
    enableNotificationServiceExtension: options.enableNotificationServiceExtension === true,
    extensionBundleIdentifier,
    extensionName,
    iosSoundFiles: options.iosSoundFiles || [],
    iosBuildNumber: ios.buildNumber || null,
    iosDeploymentTarget: options.iosDeploymentTarget,
    verbose: options.verbose === true,
  };
}

function validateProps(normalizedProps, rawProps = {}) {
  const {
    androidIcons,
    apsEnvMode,
    appleDevTeamId,
    backgroundModes,
    bundleIdentifier,
    customNotificationServiceFilePath,
    enableNotificationServiceExtension,
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

  if (backgroundModes !== undefined && !Array.isArray(backgroundModes)) {
    throwPluginError("'backgroundModes' must be an array of strings.");
  }

  if (backgroundModes !== undefined && !backgroundModes.every(mode => typeof mode === 'string')) {
    throwPluginError("'backgroundModes' must only contain strings.");
  }

  if (customNotificationServiceFilePath !== undefined && typeof customNotificationServiceFilePath !== 'string') {
    throwPluginError("'customNotificationServiceFilePath' must be a string.");
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

  if (androidIcons !== undefined && !Array.isArray(androidIcons)) {
    throwPluginError("'androidIcons' must be an array.");
  }

  for (const icon of androidIcons) {
    if (!icon || typeof icon !== 'object') {
      throwPluginError("Each entry in 'androidIcons' must be an object.");
    }

    if (typeof icon.name !== 'string' || icon.name.length === 0) {
      throwPluginError("Each Android icon must include a non-empty string 'name'.");
    }

    if (typeof icon.path !== 'string' || icon.path.length === 0) {
      throwPluginError(`Android icon '${icon.name}' must include a non-empty string 'path'.`);
    }

    if (icon.type !== 'small' && icon.type !== 'large') {
      throwPluginError(`Android icon '${icon.name}' must have type 'small' or 'large'.`);
    }
  }

  if (enableNotificationServiceExtension && !bundleIdentifier) {
    throwPluginError(
      "iOS 'bundleIdentifier' must be defined in the Expo config when 'enableNotificationServiceExtension' is true.",
    );
  }

  if (
    rawProps.notificationServiceExtensionName !== undefined &&
    typeof rawProps.notificationServiceExtensionName !== 'string'
  ) {
    throwPluginError("'notificationServiceExtensionName' must be a string when provided.");
  }
}

function getPackageRoot() {
  return path.dirname(require.resolve(`${PACKAGE_NAME}/package.json`));
}

module.exports = {
  getPackageRoot,
  log,
  normalizeProps,
  throwPluginError,
  validateProps,
  warn,
  isValidIOSSoundFileExtension,
};
