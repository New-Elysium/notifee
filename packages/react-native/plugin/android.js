const fs = require('fs');
const path = require('path');
const { imageSize: getImageSize } = require('image-size');
const { generateImageAsync } = require('@expo/image-utils');
const { withDangerousMod } = require('@expo/config-plugins');
const { LARGE_ICON_SIZES, RES_PATH, SMALL_ICON_SIZES } = require('./constants');
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

function validateIconSource(projectRoot, icon) {
  const resolvedPath = path.resolve(projectRoot, icon.path);
  if (!fs.existsSync(resolvedPath)) {
    throwPluginError(`Android icon '${icon.name}' could not be found at '${icon.path}'.`);
  }

  let dimensions;
  try {
    dimensions = getImageSize(resolvedPath);
  } catch (error) {
    throwPluginError(
      `Android icon '${icon.name}' could not be read as an image at '${icon.path}'.`,
    );
  }

  if (dimensions.width && dimensions.height && dimensions.width !== dimensions.height) {
    warn(
      `Android icon '${icon.name}' is not square (${dimensions.width}x${dimensions.height}). Notification icons usually work best with square source assets.`,
    );
  }

  if (icon.type === 'small') {
    if (path.extname(resolvedPath).toLowerCase() !== '.png') {
      warn(
        `Android small icon '${icon.name}' is not a PNG source. Status bar icons usually work best as transparent PNG assets.`,
      );
    }
  }
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

const withNotifeeAndroid = (config, props) => {
  const icons = Array.isArray(props.androidIcons) ? props.androidIcons.slice() : [];

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

  if (!icons.length) {
    return config;
  }

  return withDangerousMod(config, [
    'android',
    async modConfig => {
      for (const icon of icons) {
        await saveIcon(modConfig.modRequest.projectRoot, icon);
        log(`Generated Android ${icon.type} icon '${icon.name}'.`, props.verbose);
      }

      return modConfig;
    },
  ]);
};

module.exports = {
  withNotifeeAndroid,
};
