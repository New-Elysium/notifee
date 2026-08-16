const fs = require('fs');
const path = require('path');
const { imageSize: getImageSize } = require('image-size');
const { generateImageAsync } = require('@expo/image-utils');
const { withAndroidColors, withDangerousMod } = require('@expo/config-plugins');
const { assignColorValue } = require('@expo/config-plugins/build/android/Colors');
const {
  LARGE_ICON_SIZES,
  NOTIFICATION_COLOR_NAME,
  RAW_RES_PATH,
  RECOMMENDED_ANDROID_SOUND_EXTENSIONS,
  RES_PATH,
  SMALL_ICON_SIZES,
} = require('./constants');
const { log, throwPluginError, warn } = require('./utils');

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

async function generateSizedIconBuffer(projectRoot, iconPath, size) {
  const result = await generateImageAsync(
    { projectRoot, cacheType: 'notifee-expo-plugin' },
    {
      backgroundColor: 'transparent',
      height: size,
      resizeMode: 'cover',
      src: iconPath,
      width: size,
    },
  );

  return result.source;
}

function ensureFileExists(projectRoot, relativePath, label) {
  const resolvedPath = path.resolve(projectRoot, relativePath);
  if (!fs.existsSync(resolvedPath)) {
    throwPluginError(`${label} could not be found at '${relativePath}'.`);
  }

  return resolvedPath;
}

function validateIconSource(projectRoot, icon) {
  const resolvedPath = ensureFileExists(projectRoot, icon.path, `Android icon '${icon.name}'`);

  let dimensions;
  try {
    dimensions = getImageSize(resolvedPath);
  } catch {
    throwPluginError(
      `Android icon '${icon.name}' could not be read as an image at '${icon.path}'.`,
    );
  }

  if (dimensions.width && dimensions.height && dimensions.width !== dimensions.height) {
    warn(
      `Android icon '${icon.name}' is not square (${dimensions.width}x${dimensions.height}). Notification icons usually work best with square source assets.`,
    );
  }

  if (icon.type === 'small' && path.extname(resolvedPath).toLowerCase() !== '.png') {
    warn(
      `Android small icon '${icon.name}' is not a PNG source. Status bar icons usually work best as transparent PNG assets.`,
    );
  }
}

function validateSoundSource(projectRoot, sound) {
  const resolvedPath = ensureFileExists(projectRoot, sound.path, `Android sound '${sound.name}'`);
  const extension = path.extname(resolvedPath).toLowerCase();

  if (!extension) {
    throwPluginError(
      `Android sound '${sound.name}' must include a file extension so it can be packaged as a raw resource.`,
    );
  }

  if (!RECOMMENDED_ANDROID_SOUND_EXTENSIONS.includes(extension)) {
    warn(
      `Android sound '${sound.name}' uses '${extension}'. Android supports a wider range of audio formats than iOS, but device playback support can vary. Prefer ${RECOMMENDED_ANDROID_SOUND_EXTENSIONS.join(', ')} for the most predictable results.`,
    );
  }

  return {
    extension,
    resolvedPath,
  };
}

async function saveIcon(projectRoot, icon) {
  const folders = icon.type === 'large' ? LARGE_ICON_SIZES : SMALL_ICON_SIZES;
  validateIconSource(projectRoot, icon);

  for (const folder of folders) {
    const destinationDir = path.join(projectRoot, RES_PATH, folder.name);
    ensureDir(destinationDir);

    const buffer = await generateSizedIconBuffer(projectRoot, icon.path, folder.size);
    fs.writeFileSync(path.join(destinationDir, `${icon.name}.png`), buffer);
  }
}

function saveSound(projectRoot, sound) {
  const { extension, resolvedPath } = validateSoundSource(projectRoot, sound);
  const destinationDir = path.join(projectRoot, RAW_RES_PATH);
  ensureDir(destinationDir);
  fs.copyFileSync(resolvedPath, path.join(destinationDir, `${sound.name}${extension}`));
}

function setNotificationIconColor(xml, color) {
  return assignColorValue(xml, { name: NOTIFICATION_COLOR_NAME, value: color });
}

function withNotificationColor(config, props) {
  return withAndroidColors(config, modConfig => {
    modConfig.modResults = setNotificationIconColor(
      modConfig.modResults,
      props.androidNotificationColor,
    );
    log(
      `Set Android notification color resource '${NOTIFICATION_COLOR_NAME}' to '${props.androidNotificationColor}'.`,
      props.verbose,
    );
    return modConfig;
  });
}

const withNotifeeAndroid = (config, props) => {
  let nextConfig = config;

  if (props.androidNotificationColor) {
    nextConfig = withNotificationColor(nextConfig, props);
  }

  const icons = Array.isArray(props.androidIcons) ? props.androidIcons.slice() : [];
  const sounds = Array.isArray(props.androidSoundFiles) ? props.androidSoundFiles.slice() : [];

  if (config.notification && config.notification.icon) {
    const configIconName = path.parse(config.notification.icon).name;
    if (!icons.some(icon => icon.name === configIconName && icon.type === 'small')) {
      icons.push({
        name: configIconName,
        path: config.notification.icon,
        type: 'small',
      });
    }
  }

  if (!icons.length && !sounds.length) {
    return nextConfig;
  }

  return withDangerousMod(nextConfig, [
    'android',
    async modConfig => {
      for (const icon of icons) {
        await saveIcon(modConfig.modRequest.projectRoot, icon);
        log(`Generated Android ${icon.type} icon '${icon.name}'.`, props.verbose);
      }

      for (const sound of sounds) {
        saveSound(modConfig.modRequest.projectRoot, sound);
        log(`Copied Android notification sound '${sound.name}'.`, props.verbose);
      }

      return modConfig;
    },
  ]);
};

module.exports = {
  setNotificationIconColor,
  withNotifeeAndroid,
};
