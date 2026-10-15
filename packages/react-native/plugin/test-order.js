/**
 * Regression test for the ORDER of the withXcodeProject mods registered in
 * withNotifeeIos.
 *
 * Expo's mod compiler runs each newly registered withXcodeProject mod first
 * and passes the previously registered one as `nextMod`, i.e. the mods
 * execute in REVERSE registration order. The extension target must
 * therefore be registered AFTER the sound linker, so that
 * addExtensionTarget executes first and copyIOSSoundFiles links the sounds
 * into the already-created NSE target.
 *
 * test-sound.js drives addResourceFileToTarget() directly against a fixture
 * that already contains the NSE target, so it cannot catch an ordering bug:
 * only the real mod compiler exercises the chain. This test runs the real
 * plugin through the real compiler against a fresh project fixture that
 * contains ONLY the app target, then asserts the persisted pbxproj links
 * the sound into the NSE's Resources phase.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const { compileModsAsync } = require('@expo/config-plugins');
const xcode = require('xcode');
const withNotifee = require('./withNotifee');
const { IOS_SOUNDS_DIR, DEFAULT_EXTENSION_NAME } = require('./constants');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notifee-order-'));
const projectRoot = tmpDir;
const iosDir = path.join(projectRoot, 'ios');
const appName = 'MyApp';

// Fresh prebuild fixture: the NSE target does NOT exist yet, the app target
// does. Object keys carry Xcode-style /* comments */ because xcode's
// comment-based lookups resolve entries by comment, and the XCBuildConfiguration
// / XCConfigurationList section markers must exist because the parser only
// creates sections present in the file and addTarget writes into them.
const pbxprojPath = path.join(iosDir, `${appName}.xcodeproj`, 'project.pbxproj');
fs.mkdirSync(path.dirname(pbxprojPath), { recursive: true });

const pbxprojContent = `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 46;
	objects = {

/* Begin PBXBuildFile section */
/* End PBXBuildFile section */

/* Begin PBXCopyFilesBuildPhase section */
/* End PBXCopyFilesBuildPhase section */

/* Begin PBXContainerItemProxy section */
/* End PBXContainerItemProxy section */

/* Begin PBXFileReference section */
		APP_PRODUCT_UUID /* MyApp.app */ = {
			isa = PBXFileReference;
			explicitFileType = wrapper.application;
			includeInIndex = 0;
			path = MyApp.app;
			sourceTree = BUILT_PRODUCTS_DIR;
		};
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		MAIN_GROUP_UUID /* MyApp */ = {
			isa = PBXGroup;
			children = (
				APP_PRODUCT_UUID /* MyApp.app */,
			);
			name = MyApp;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		APP_TARGET_UUID /* MyApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = APP_TARGET_CONFIG_LIST_UUID;
			buildPhases = (
				APP_RESOURCES_PHASE_UUID /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = MyApp;
			productName = MyApp;
			productReference = APP_PRODUCT_UUID;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		PROJECT_UUID /* Project object */ = {
			isa = PBXProject;
			attributes = {
				LastUpgradeCheck = 1300;
			};
			buildConfigurationList = PROJECT_CONFIG_LIST_UUID;
			compatibilityVersion = "Xcode 11.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = MAIN_GROUP_UUID;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				APP_TARGET_UUID /* MyApp */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		APP_RESOURCES_PHASE_UUID /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
/* End PBXSourcesBuildPhase section */

/* Begin PBXTargetDependency section */
/* End PBXTargetDependency section */

/* Begin XCBuildConfiguration section */
		APP_DEBUG_CONFIG_UUID /* Debug */ = {
			isa = XCBuildConfiguration;
			name = Debug;
			buildSettings = {
				CODE_SIGN_ENTITLEMENTS = MyApp/MyApp.entitlements;
				INFOPLIST_FILE = MyApp/Info.plist;
				PRODUCT_BUNDLE_IDENTIFIER = com.test.myapp;
				PRODUCT_NAME = MyApp;
			};
		};
		APP_RELEASE_CONFIG_UUID /* Release */ = {
			isa = XCBuildConfiguration;
			name = Release;
			buildSettings = {
				CODE_SIGN_ENTITLEMENTS = MyApp/MyApp.entitlements;
				INFOPLIST_FILE = MyApp/Info.plist;
				PRODUCT_BUNDLE_IDENTIFIER = com.test.myapp;
				PRODUCT_NAME = MyApp;
			};
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		APP_TARGET_CONFIG_LIST_UUID /* Build configuration list for PBXNativeTarget "MyApp" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				APP_DEBUG_CONFIG_UUID /* Debug */,
				APP_RELEASE_CONFIG_UUID /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		PROJECT_CONFIG_LIST_UUID /* Build configuration list for PBXProject "MyApp" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = PROJECT_UUID;
}
`;

fs.writeFileSync(pbxprojPath, pbxprojContent);

// The base mod providers expo registers for every compile read these files
// (appDelegate, expoPlist, infoPlist, entitlements); the sound linker and
// Podfile mod read the sound asset and the Podfile.
const appDir = path.join(iosDir, appName);
fs.mkdirSync(path.join(appDir, 'Supporting'), { recursive: true });

const plistHeader = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">`;

fs.writeFileSync(
  path.join(appDir, 'Info.plist'),
  `${plistHeader}
<dict>
	<key>CFBundleName</key>
	<string>MyApp</string>
</dict>
</plist>
`,
);

fs.writeFileSync(
  path.join(appDir, 'MyApp.entitlements'),
  `${plistHeader}
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>group.com.test.myapp</string>
	</array>
</dict>
</plist>
`,
);

fs.writeFileSync(
  path.join(appDir, 'Supporting', 'Expo.plist'),
  `${plistHeader}
<dict>
	<key>EXUpdatesCheckOnLaunch</key>
	<string>NEVER</string>
</dict>
</plist>
`,
);

fs.writeFileSync(path.join(appDir, 'AppDelegate.h'), '#import <UIKit/UIKit.h>\n');
fs.writeFileSync(
  path.join(appDir, 'AppDelegate.mm'),
  '#import "AppDelegate.h"\n\n@implementation AppDelegate\n\n@end\n',
);

fs.writeFileSync(path.join(iosDir, 'Podfile'), "target 'MyApp' do\nend\n");

const soundPath = path.join(projectRoot, 'assets', 'chime.wav');
fs.mkdirSync(path.dirname(soundPath), { recursive: true });
fs.writeFileSync(soundPath, Buffer.from('RIFF fake wav content'));

const config = {
  name: appName,
  ios: {
    bundleIdentifier: 'com.test.myapp',
    buildNumber: '1',
    entitlements: {
      'com.apple.security.application-groups': ['group.com.test.myapp'],
    },
  },
  version: '1.0.0',
};

const props = {
  iosSoundFiles: ['./assets/chime.wav'],
  enableNotificationServiceExtension: true,
  appleDevTeamId: 'XXXXXXXXXX',
};

let failures = 0;
function check(label, condition, detail) {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures++;
    console.error(`FAIL: ${label}${detail ? ` (${detail})` : ''}`);
  }
}

function unquote(value) {
  return typeof value === 'string' ? value.replace(/^"+|"+$/g, '') : value;
}

function findObjectKeyByComment(section, name) {
  for (const key of Object.keys(section || {})) {
    if (!key.endsWith('_comment')) continue;
    if (section[key] === name || unquote(section[key]) === unquote(name)) {
      return key.slice(0, -'_comment'.length);
    }
  }
  return null;
}

async function main() {
  const moddedConfig = withNotifee(config, props);

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = message => warnings.push(String(message));
  let compileError = null;
  try {
    await compileModsAsync(moddedConfig, { projectRoot, platforms: ['ios'] });
  } catch (error) {
    // Tolerated: expo's providers can bail on a minimal fixture, but only
    // after the xcodeProject mod has written the pbxproj — which is all
    // this test asserts on.
    compileError = error;
  } finally {
    console.warn = originalWarn;
  }

  if (compileError) {
    console.log(`compiler stopped after the pbxproj was written: ${compileError.message}`);
  }
  for (const warning of warnings) {
    console.log(`warning: ${warning.trim()}`);
  }

  // Re-parse the persisted output so assertions run against what Xcode loads
  const persisted = xcode.project(pbxprojPath);
  persisted.parseSync();
  const objects = persisted.hash.project.objects;

  const nativeTargets = objects.PBXNativeTarget;
  const nseTargetKeys = Object.keys(nativeTargets).filter(
    key => !key.endsWith('_comment') && unquote(nativeTargets[key].name) === DEFAULT_EXTENSION_NAME,
  );
  check(
    `NSE target '${DEFAULT_EXTENSION_NAME}' exists exactly once`,
    nseTargetKeys.length === 1,
    `found ${nseTargetKeys.length}`,
  );

  const fileRefs = objects.PBXFileReference || {};
  const chimeRefKey = Object.keys(fileRefs).find(
    key => !key.endsWith('_comment') && unquote(fileRefs[key].path) === 'chime.wav',
  );
  check('bundle-root file reference for chime.wav exists', Boolean(chimeRefKey));

  function resourceLabels(targetName) {
    const targetKey = findObjectKeyByComment(nativeTargets, targetName);
    if (!targetKey) return [];
    return (nativeTargets[targetKey].buildPhases || []).flatMap(entry => {
      const phaseKey = (entry && entry.value) || entry;
      const phase = objects.PBXResourcesBuildPhase[phaseKey];
      return phase && phase.files ? phase.files.map(f => (f && f.value) || f) : [];
    }).map(buildFileKey => {
      const comment = objects.PBXBuildFile[`${buildFileKey}_comment`];
      if (comment) return unquote(comment);
      const ref = objects.PBXBuildFile[buildFileKey] && fileRefs[objects.PBXBuildFile[buildFileKey].fileRef];
      return ref ? `${unquote(ref.path)} in Resources` : buildFileKey;
    });
  }

  const appResources = resourceLabels(appName);
  const nseResources = resourceLabels(DEFAULT_EXTENSION_NAME);
  console.log(`=> NSE exists:${nseTargetKeys.length > 0} NSE Resources:${JSON.stringify(nseResources)}`);

  // The bug: copyIOSSoundFiles ran before addExtensionTarget, could not
  // resolve the not-yet-created NSE target and left its Resources empty.
  check('app target Resources phase includes chime.wav', appResources.includes('chime.wav in Resources'));
  check('NSE target Resources phase includes chime.wav', nseResources.includes('chime.wav in Resources'));

  // One shared file reference, exactly one build file per target: a second
  // NSE target would mean the linker created the target twice.
  const chimeBuildFileKeys = Object.keys(objects.PBXBuildFile || {}).filter(
    key => !key.endsWith('_comment') && objects.PBXBuildFile[key].fileRef === chimeRefKey,
  );
  check(
    'exactly one build file per target (no duplicate linking)',
    chimeBuildFileKeys.length === 2,
    `found ${chimeBuildFileKeys.length}`,
  );

  check(
    'no "extension target was not found" warning',
    !warnings.some(warning => warning.includes('was not found')),
  );

  check(
    `sound copied to disk under ios/${IOS_SOUNDS_DIR}/`,
    fs.existsSync(path.join(iosDir, IOS_SOUNDS_DIR, 'chime.wav')),
  );

  if (process.env.DEBUG_PBXPROJ) {
    console.log('\n----- serialized project.pbxproj -----');
    console.log(fs.readFileSync(pbxprojPath, 'utf8'));
  }

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
  return failures === 0;
}

main().then(ok => process.exit(ok ? 0 : 1));
