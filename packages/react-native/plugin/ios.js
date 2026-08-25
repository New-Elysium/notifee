const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require('@expo/config-plugins');
const {
  DEFAULT_APP_VERSION,
  DEFAULT_IOS_BUILD_NUMBER,
  DEFAULT_NOTIFICATION_SERVICE_FILE,
  IOS_SOUNDS_DIR,
  USER_ACTIVITY_TYPES,
  VALID_IOS_SOUND_EXTENSIONS,
} = require('./constants');
const { isValidIOSSoundFileExtension, log, throwPluginError } = require('./utils');

function getExtensionDir(projectRoot, extensionName) {
  return path.join(projectRoot, 'ios', extensionName);
}

function getMainGroupUuid(project) {
  return project.getFirstProject().firstProject.mainGroup;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeUniqueArrayValues(base, extra) {
  const seen = new Set();
  const merged = [];

  for (const value of base.concat(extra)) {
    const key = JSON.stringify(value);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(value);
    }
  }

  return merged;
}

function mergePlistValues(baseValue, overrideValue) {
  if (Array.isArray(baseValue) && Array.isArray(overrideValue)) {
    return mergeUniqueArrayValues(baseValue, overrideValue);
  }

  if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
    return mergePlistObjects(baseValue, overrideValue);
  }

  return overrideValue;
}

function mergePlistObjects(baseObject, overrideObject) {
  const merged = { ...baseObject };

  for (const [key, value] of Object.entries(overrideObject || {})) {
    if (key in merged) {
      merged[key] = mergePlistValues(merged[key], value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

function escapePlistString(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function serializePlistValue(value, indentLevel) {
  const indent = '  '.repeat(indentLevel);

  if (Array.isArray(value)) {
    if (!value.length) {
      return `${indent}<array/>\n`;
    }

    let output = `${indent}<array>\n`;
    for (const item of value) {
      output += serializePlistValue(item, indentLevel + 1);
    }
    output += `${indent}</array>\n`;
    return output;
  }

  if (isPlainObject(value)) {
    let output = `${indent}<dict>\n`;
    for (const [key, dictValue] of Object.entries(value)) {
      output += `${indent}  <key>${escapePlistString(key)}</key>\n`;
      output += serializePlistValue(dictValue, indentLevel + 1);
    }
    output += `${indent}</dict>\n`;
    return output;
  }

  if (typeof value === 'boolean') {
    return `${indent}<${value ? 'true' : 'false'}/>\n`;
  }

  if (typeof value === 'number') {
    const tag = Number.isInteger(value) ? 'integer' : 'real';
    return `${indent}<${tag}>${value}</${tag}>\n`;
  }

  return `${indent}<string>${escapePlistString(value)}</string>\n`;
}

function createPlistDocument(rootObject) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
${serializePlistValue(rootObject, 0)}</plist>
`;
}

function getExtensionInfoPlist(props, appVersion, buildNumber) {
  return mergePlistObjects(
    {
      CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)',
      CFBundleDisplayName: props.extensionName,
      CFBundleExecutable: '$(EXECUTABLE_NAME)',
      CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      CFBundleInfoDictionaryVersion: '6.0',
      CFBundleName: '$(PRODUCT_NAME)',
      CFBundlePackageType: 'XPC!',
      CFBundleShortVersionString: appVersion,
      CFBundleVersion: buildNumber,
      NSExtension: {
        NSExtensionPointIdentifier: 'com.apple.usernotifications.service',
        NSExtensionPrincipalClass: '$(PRODUCT_MODULE_NAME).NotificationService',
      },
    },
    props.extensionInfoPlist,
  );
}

function getExtensionEntitlements(props) {
  const baseEntitlements = {};

  if (props.appGroupName) {
    baseEntitlements['com.apple.security.application-groups'] = [props.appGroupName];
  }

  return mergePlistObjects(baseEntitlements, props.extensionEntitlements);
}

function createNotificationServiceHeader() {
  return `#import <UserNotifications/UserNotifications.h>

@interface NotificationService : UNNotificationServiceExtension

@end
`;
}

function createNotificationServiceImplementation() {
  return `#import "NotificationService.h"
#import "NotifeeExtensionHelper.h"

@interface NotificationService ()

@property(nonatomic, strong) void (^contentHandler)(UNNotificationContent *contentToDeliver);
@property(nonatomic, strong) UNMutableNotificationContent *bestAttemptContent;

@end

@implementation NotificationService

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request
                 withContentHandler:(void (^)(UNNotificationContent *_Nonnull))contentHandler {
  self.contentHandler = contentHandler;
  self.bestAttemptContent = [request.content mutableCopy];

  [NotifeeExtensionHelper populateNotificationContent:request
                                          withContent:self.bestAttemptContent
                                   withContentHandler:contentHandler];
}

- (void)serviceExtensionTimeWillExpire {
  if (self.contentHandler != nil && self.bestAttemptContent != nil) {
    self.contentHandler(self.bestAttemptContent);
  }
}

@end
`;
}

function createExtensionInfoPlist(props, appVersion, buildNumber) {
  return createPlistDocument(getExtensionInfoPlist(props, appVersion, buildNumber));
}

function createExtensionEntitlements(props) {
  return createPlistDocument(getExtensionEntitlements(props));
}

function createPodfileTargetBlock(extensionName) {
  return `
package_json = \`node --print "require.resolve('@psync/notifee/package.json')"\`.strip
raise '[Notifee] Failed to resolve @psync/notifee/package.json via Node during pod install. Ensure Node is available, run bun install or npm install, and then retry pod install.' if package_json.nil? || package_json.empty?
podspec = File.join(File.dirname(package_json), 'RNNotifeeCore.podspec')
$NotifeeExtension = true
target '${extensionName}' do
  pod 'RNNotifeeCore', :path => podspec
  if defined?(podfile_properties) && podfile_properties && podfile_properties['ios.useFrameworks']
    use_frameworks! :linkage => podfile_properties['ios.useFrameworks'].to_sym
  end
end
`;
}

function addPodfileTarget(config, props) {
  return withDangerousMod(config, [
    'ios',
    async modConfig => {
      const podfilePath = path.join(modConfig.modRequest.projectRoot, 'ios', 'Podfile');
      const podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes(`target '${props.extensionName}' do`)) {
        fs.appendFileSync(podfilePath, createPodfileTargetBlock(props.extensionName));
        log(`Appended '${props.extensionName}' target to Podfile.`, props.verbose);
      }

      return modConfig;
    },
  ]);
}

function addExtensionFiles(config, props) {
  return withDangerousMod(config, [
    'ios',
    async modConfig => {
      const iosDir = getExtensionDir(modConfig.modRequest.projectRoot, props.extensionName);
      fs.mkdirSync(iosDir, { recursive: true });

      const appVersion = modConfig.version || DEFAULT_APP_VERSION;
      const buildNumber = modConfig.ios?.buildNumber || DEFAULT_IOS_BUILD_NUMBER;

      fs.writeFileSync(
        path.join(iosDir, 'NotificationService.h'),
        createNotificationServiceHeader(),
      );
      fs.writeFileSync(
        path.join(iosDir, `${props.extensionName}-Info.plist`),
        createExtensionInfoPlist(props, appVersion, buildNumber),
      );
      fs.writeFileSync(
        path.join(iosDir, `${props.extensionName}.entitlements`),
        createExtensionEntitlements(props),
      );

      const defaultNotificationServicePath = path.join(iosDir, DEFAULT_NOTIFICATION_SERVICE_FILE);

      if (props.customNotificationServiceFilePath) {
        const customSourcePath = path.resolve(
          modConfig.modRequest.projectRoot,
          props.customNotificationServiceFilePath,
        );

        if (!fs.existsSync(customSourcePath)) {
          throwPluginError(
            `Custom notification service file '${props.customNotificationServiceFilePath}' could not be found.`,
          );
        }

        const customSource = fs.readFileSync(customSourcePath);
        fs.writeFileSync(defaultNotificationServicePath, customSource);
      } else {
        fs.writeFileSync(defaultNotificationServicePath, createNotificationServiceImplementation());
      }

      return modConfig;
    },
  ]);
}

function ensureSoundFile(projectRoot, soundPath) {
  const resolvedPath = path.resolve(projectRoot, soundPath);
  if (!fs.existsSync(resolvedPath)) {
    throwPluginError(`iOS sound file '${soundPath}' could not be found.`);
  }

  if (!isValidIOSSoundFileExtension(resolvedPath)) {
    throwPluginError(
      `iOS sound file '${soundPath}' must use one of: ${VALID_IOS_SOUND_EXTENSIONS.join(', ')}.`,
    );
  }

  return resolvedPath;
}

function unquote(value) {
  return typeof value === 'string' ? value.replace(/^"+|"+$/g, '') : value;
}

function findObjectKeyByComment(section, name) {
  if (!section || !name) {
    return null;
  }

  const suffix = '_comment';
  const wanted = unquote(name);
  for (const key of Object.keys(section)) {
    if (!key.endsWith(suffix)) continue;
    if (section[key] === name || unquote(section[key]) === wanted) {
      return key.slice(0, -suffix.length);
    }
  }

  return null;
}

function findFileReferenceKeyByPath(section, filePath) {
  if (!section) {
    return null;
  }

  for (const key of Object.keys(section)) {
    if (key.endsWith('_comment')) continue;
    if (unquote(section[key].path) === filePath && unquote(section[key].sourceTree) === '<group>') {
      return key;
    }
  }

  return null;
}

function addResourceFileToTarget(project, filePath, target, groupName) {
  const objects = project.hash.project.objects;
  const targetName = target && target.name;
  const fileName = path.basename(filePath);

  // xcode's pbxTargetByName() does not expose the resolved object's uuid key
  const targetKey = findObjectKeyByComment(objects.PBXNativeTarget, targetName);
  if (!targetKey) {
    throwPluginError(`Could not find Xcode target '${targetName}'.`);
  }

  // Resolve the Resources build phase belonging to this specific target;
  // buildPhase() returns "<phaseUuid>_comment"
  const phaseCommentKey = project.buildPhase('Resources', targetKey);
  if (!phaseCommentKey) {
    throwPluginError(`Xcode target '${targetName}' has no Resources build phase.`);
  }
  const phase = objects.PBXResourcesBuildPhase[phaseCommentKey.replace(/_comment$/, '')];

  // Ensure the named group exists and hangs off the main group so its
  // relative path resolves from the ios/ directory
  let groupKey = null;
  if (groupName) {
    groupKey = findObjectKeyByComment(objects.PBXGroup, groupName);
    if (!groupKey) {
      const created = project.addPbxGroup([], groupName, groupName, '"<group>"');
      groupKey = created.uuid;
      project.addToPbxGroup(groupKey, getMainGroupUuid(project));
    }
  }

  // Reuse an existing bundle-root file reference across targets; sounds are
  // referenced by filename only at runtime
  let fileRefKey = findFileReferenceKeyByPath(objects.PBXFileReference, fileName);
  if (!fileRefKey) {
    fileRefKey = project.generateUuid();
    objects.PBXFileReference[fileRefKey] = {
      isa: 'PBXFileReference',
      name: `"${fileName}"`,
      path: `"${fileName}"`,
      sourceTree: '"<group>"',
    };
    objects.PBXFileReference[`${fileRefKey}_comment`] = fileName;

    if (groupKey) {
      objects.PBXGroup[groupKey].children.push({ value: fileRefKey, comment: fileName });
    }
  }

  // Link the file into this target's Resources phase (idempotent). A shared
  // PBXBuildFile cannot be reused because membership is per target and
  // xcode's addResourceFile() deduplicates by path, skipping other targets.
  const alreadyLinked = (phase.files || []).some(entry => {
    const entryKey = typeof entry === 'object' ? entry.value : entry;
    const buildFile = objects.PBXBuildFile[entryKey];
    return buildFile && buildFile.fileRef === fileRefKey;
  });
  if (alreadyLinked) {
    return;
  }

  const buildFileKey = project.generateUuid();
  const buildFileComment = `${fileName} in Resources`;
  objects.PBXBuildFile[buildFileKey] = {
    isa: 'PBXBuildFile',
    fileRef: fileRefKey,
  };
  objects.PBXBuildFile[`${buildFileKey}_comment`] = buildFileComment;
  phase.files.push({ value: buildFileKey, comment: buildFileComment });
}

function copyIOSSoundFiles(config, props) {
  if (!props.iosSoundFiles.length) {
    return config;
  }

  const updatedConfig = withDangerousMod(config, [
    'ios',
    async modConfig => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const iosRoot = path.join(projectRoot, 'ios');
      const mainSoundsDir = path.join(iosRoot, IOS_SOUNDS_DIR);
      fs.mkdirSync(mainSoundsDir, { recursive: true });

      for (const soundPath of props.iosSoundFiles) {
        const sourcePath = ensureSoundFile(projectRoot, soundPath);
        const fileName = path.basename(sourcePath);
        fs.copyFileSync(sourcePath, path.join(mainSoundsDir, fileName));

        log(`Copied iOS notification sound '${fileName}'.`, props.verbose);
      }

      return modConfig;
    },
  ]);

  return withXcodeProject(updatedConfig, modConfig => {
    const project = modConfig.modResults;
    const appTarget = project.pbxTargetByName(modConfig.name);
    if (!appTarget) {
      return modConfig;
    }

    for (const soundPath of props.iosSoundFiles) {
      const fileName = path.basename(soundPath);
      addResourceFileToTarget(project, fileName, appTarget, IOS_SOUNDS_DIR);

      if (props.enableNotificationServiceExtension) {
        const extensionTarget = project.pbxTargetByName(props.extensionName);
        if (extensionTarget) {
          addResourceFileToTarget(project, fileName, extensionTarget, IOS_SOUNDS_DIR);
        }
      }
    }

    return modConfig;
  });
}

function addExtensionTarget(config, props) {
  return withXcodeProject(config, modConfig => {
    const project = modConfig.modResults;
    const existingTargetUuid = project.findTargetKey(props.extensionName);
    let targetUuid = existingTargetUuid;

    const objects = project.hash.project.objects;
    objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {};
    objects.PBXTargetDependency = objects.PBXTargetDependency || {};

    if (!existingTargetUuid) {
      const target = project.addTarget(
        props.extensionName,
        'app_extension',
        props.extensionName,
        props.extensionBundleIdentifier,
      );
      targetUuid = target.uuid;

      project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', targetUuid);
      project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetUuid);
      project.addBuildPhase(
        [DEFAULT_NOTIFICATION_SERVICE_FILE],
        'PBXSourcesBuildPhase',
        'Sources',
        targetUuid,
      );

      const group = project.addPbxGroup(
        [
          `${props.extensionName}-Info.plist`,
          `${props.extensionName}.entitlements`,
          'NotificationService.h',
          DEFAULT_NOTIFICATION_SERVICE_FILE,
        ],
        props.extensionName,
        props.extensionName,
      );

      project.addToPbxGroup(group.uuid, getMainGroupUuid(project));
    }

    const configurations = project.pbxXCBuildConfigurationSection();
    Object.keys(configurations).forEach(key => {
      const cfg = configurations[key];
      if (!cfg || !cfg.buildSettings) {
        return;
      }

      if (cfg.buildSettings.PRODUCT_NAME === `"${props.extensionName}"`) {
        cfg.buildSettings = {
          ...cfg.buildSettings,
          CODE_SIGN_ENTITLEMENTS: `${props.extensionName}/${props.extensionName}.entitlements`,
          CODE_SIGN_STYLE: 'Automatic',
          INFOPLIST_FILE: `${props.extensionName}/${props.extensionName}-Info.plist`,
          IPHONEOS_DEPLOYMENT_TARGET: props.iosDeploymentTarget,
          PRODUCT_BUNDLE_IDENTIFIER: props.extensionBundleIdentifier,
          SWIFT_VERSION: '5.0',
          TARGETED_DEVICE_FAMILY: modConfig.ios?.supportsTablet ? '"1,2"' : '"1"',
        };

        if (props.appleDevTeamId) {
          cfg.buildSettings.DEVELOPMENT_TEAM = props.appleDevTeamId;
        }
      }
    });

    log(
      `${existingTargetUuid ? 'Updated' : 'Created'} Xcode target '${props.extensionName}'.`,
      props.verbose,
    );
    return modConfig;
  });
}

function signTargets(config, props) {
  if (!props.appleDevTeamId) {
    return config;
  }

  return withXcodeProject(config, modConfig => {
    const project = modConfig.modResults;
    const mainTarget = project.pbxTargetByName(modConfig.name);
    if (mainTarget) {
      project.addTargetAttribute('DevelopmentTeam', props.appleDevTeamId, mainTarget);
    }

    const extensionTarget = project.pbxTargetByName(props.extensionName);
    if (extensionTarget) {
      project.addTargetAttribute('DevelopmentTeam', props.appleDevTeamId, extensionTarget);
    }

    return modConfig;
  });
}

function addAppExtensionConfig(config, props) {
  const appExtensions = config.extra?.eas?.build?.experimental?.ios?.appExtensions || [];
  const entitlements = getExtensionEntitlements(props);
  const nextExtension = {
    bundleIdentifier: props.extensionBundleIdentifier,
    entitlements,
    targetName: props.extensionName,
  };
  const hasExistingExtension = appExtensions.some(
    extension => extension.targetName === props.extensionName,
  );
  const nextAppExtensions = hasExistingExtension
    ? appExtensions.map(extension =>
        extension.targetName === props.extensionName
          ? { ...extension, ...nextExtension }
          : extension,
      )
    : appExtensions.concat([nextExtension]);

  return {
    ...config,
    extra: {
      ...config.extra,
      eas: {
        ...config.extra?.eas,
        build: {
          ...config.extra?.eas?.build,
          experimental: {
            ...config.extra?.eas?.build?.experimental,
            ios: {
              ...config.extra?.eas?.build?.experimental?.ios,
              appExtensions: nextAppExtensions,
            },
          },
        },
      },
    },
  };
}

function withNotifeeIos(config, props) {
  let nextConfig = config;

  if (props.apsEnvMode) {
    nextConfig = withEntitlementsPlist(nextConfig, modConfig => {
      modConfig.modResults['aps-environment'] = props.apsEnvMode;
      return modConfig;
    });
  }

  if (props.backgroundModes !== undefined && props.backgroundModes.length > 0) {
    nextConfig = withInfoPlist(nextConfig, modConfig => {
      const currentModes = Array.isArray(modConfig.modResults.UIBackgroundModes)
        ? modConfig.modResults.UIBackgroundModes
        : [];

      for (const mode of props.backgroundModes) {
        if (!currentModes.includes(mode)) {
          currentModes.push(mode);
        }
      }

      modConfig.modResults.UIBackgroundModes = currentModes;
      return modConfig;
    });
  }

  if (props.enableCommunicationNotifications) {
    nextConfig = withEntitlementsPlist(nextConfig, modConfig => {
      modConfig.modResults['com.apple.developer.usernotifications.communication'] = true;
      return modConfig;
    });

    nextConfig = withInfoPlist(nextConfig, modConfig => {
      const currentTypes = Array.isArray(modConfig.modResults.NSUserActivityTypes)
        ? modConfig.modResults.NSUserActivityTypes
        : [];

      for (const activityType of USER_ACTIVITY_TYPES) {
        if (!currentTypes.includes(activityType)) {
          currentTypes.push(activityType);
        }
      }

      modConfig.modResults.NSUserActivityTypes = currentTypes;
      return modConfig;
    });
  }

  if (!props.enableNotificationServiceExtension) {
    return copyIOSSoundFiles(nextConfig, props);
  }

  nextConfig = withEntitlementsPlist(nextConfig, modConfig => {
    const key = 'com.apple.security.application-groups';
    const requiredGroups = Array.isArray(getExtensionEntitlements(props)[key])
      ? getExtensionEntitlements(props)[key]
      : [];
    const currentGroups = Array.isArray(modConfig.modResults[key]) ? modConfig.modResults[key] : [];
    for (const group of requiredGroups) {
      if (!currentGroups.includes(group)) {
        currentGroups.push(group);
      }
    }
    modConfig.modResults[key] = currentGroups;
    return modConfig;
  });

  nextConfig = addAppExtensionConfig(nextConfig, props);
  nextConfig = addPodfileTarget(nextConfig, props);
  nextConfig = addExtensionFiles(nextConfig, props);
  nextConfig = addExtensionTarget(nextConfig, props);
  nextConfig = signTargets(nextConfig, props);
  nextConfig = copyIOSSoundFiles(nextConfig, props);

  return nextConfig;
}

module.exports = {
  addResourceFileToTarget,
  withNotifeeIos,
};
