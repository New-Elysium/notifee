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
  DEFAULT_IOS_DEPLOYMENT_TARGET,
  DEFAULT_NOTIFICATION_SERVICE_FILE,
  USER_ACTIVITY_TYPES,
} = require('./constants');
const { log } = require('./utils');

function getExtensionDir(projectRoot, extensionName) {
  return path.join(projectRoot, 'ios', extensionName);
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

function createExtensionInfoPlist(extensionName, appVersion, buildNumber) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>${extensionName}</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>XPC!</string>
  <key>CFBundleShortVersionString</key>
  <string>${appVersion}</string>
  <key>CFBundleVersion</key>
  <string>${buildNumber}</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.usernotifications.service</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).NotificationService</string>
  </dict>
</dict>
</plist>
`;
}

function createExtensionEntitlements(appGroupName) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${appGroupName}</string>
  </array>
</dict>
</plist>
`;
}

function createPodfileTargetBlock(extensionName) {
  return `
podspec = File.join(File.dirname(\`node --print "require.resolve('@psync/notifee/package.json')"\`), 'RNNotifeeCore.podspec')
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

      fs.writeFileSync(path.join(iosDir, 'NotificationService.h'), createNotificationServiceHeader());
      fs.writeFileSync(
        path.join(iosDir, `${props.extensionName}-Info.plist`),
        createExtensionInfoPlist(props.extensionName, appVersion, buildNumber),
      );
      fs.writeFileSync(
        path.join(iosDir, `${props.extensionName}.entitlements`),
        createExtensionEntitlements(props.appGroupName),
      );

      const defaultNotificationServicePath = path.join(iosDir, DEFAULT_NOTIFICATION_SERVICE_FILE);

      if (props.customNotificationServiceFilePath) {
        const customSource = fs.readFileSync(
          path.resolve(modConfig.modRequest.projectRoot, props.customNotificationServiceFilePath),
        );
        fs.writeFileSync(defaultNotificationServicePath, customSource);
      } else {
        fs.writeFileSync(defaultNotificationServicePath, createNotificationServiceImplementation());
      }

      return modConfig;
    },
  ]);
}

function addExtensionTarget(config, props) {
  return withXcodeProject(config, modConfig => {
    const project = modConfig.modResults;
    if (project.pbxTargetByName(props.extensionName)) {
      return modConfig;
    }

    const objects = project.hash.project.objects;
    objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {};
    objects.PBXTargetDependency = objects.PBXTargetDependency || {};

    const target = project.addTarget(
      props.extensionName,
      'app_extension',
      props.extensionName,
      props.extensionBundleIdentifier,
    );

    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
    project.addBuildPhase([DEFAULT_NOTIFICATION_SERVICE_FILE], 'PBXSourcesBuildPhase', 'Sources', target.uuid);

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

    const pbxGroups = project.hash.project.objects.PBXGroup;
    Object.keys(pbxGroups).forEach(key => {
      if (typeof pbxGroups[key] === 'object' && !pbxGroups[key].name && !pbxGroups[key].path) {
        project.addToPbxGroup(group.uuid, key);
      }
    });

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
          IPHONEOS_DEPLOYMENT_TARGET:
            props.iosDeploymentTarget || DEFAULT_IOS_DEPLOYMENT_TARGET,
          PRODUCT_BUNDLE_IDENTIFIER: props.extensionBundleIdentifier,
          SWIFT_VERSION: '5.0',
          TARGETED_DEVICE_FAMILY: modConfig.ios?.supportsTablet ? '"1,2"' : '"1"',
        };

        if (props.appleDevTeamId) {
          cfg.buildSettings.DEVELOPMENT_TEAM = props.appleDevTeamId;
        }
      }
    });

    log(`Created Xcode target '${props.extensionName}'.`, props.verbose);
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
  if (appExtensions.find(extension => extension.targetName === props.extensionName)) {
    return config;
  }

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
              appExtensions: appExtensions.concat([
                {
                  bundleIdentifier: props.extensionBundleIdentifier,
                  entitlements: {
                    'com.apple.security.application-groups': [props.appGroupName],
                  },
                  targetName: props.extensionName,
                },
              ]),
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
    return nextConfig;
  }

  nextConfig = withEntitlementsPlist(nextConfig, modConfig => {
    const key = 'com.apple.security.application-groups';
    const currentGroups = Array.isArray(modConfig.modResults[key]) ? modConfig.modResults[key] : [];
    if (!currentGroups.includes(props.appGroupName)) {
      currentGroups.push(props.appGroupName);
    }
    modConfig.modResults[key] = currentGroups;
    return modConfig;
  });

  nextConfig = addAppExtensionConfig(nextConfig, props);
  nextConfig = addPodfileTarget(nextConfig, props);
  nextConfig = addExtensionFiles(nextConfig, props);
  nextConfig = addExtensionTarget(nextConfig, props);
  nextConfig = signTargets(nextConfig, props);

  return nextConfig;
}

module.exports = {
  withNotifeeIos,
};
