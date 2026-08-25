const path = require('path');
const fs = require('fs');
const os = require('os');

const { normalizeProps, validateProps } = require('./utils');
const { addResourceFileToTarget } = require('./ios');
const { IOS_SOUNDS_DIR, DEFAULT_EXTENSION_NAME } = require('./constants');

// Create a minimal fake iOS project structure
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notifee-test-'));
const iosDir = path.join(tmpDir, 'ios');
fs.mkdirSync(iosDir, { recursive: true });

// Create a minimal pbxproj file. Object keys carry Xcode-style /* comments */
// because xcode's pbxTargetByName/pbxGroupByName resolve entries by comment.
const pbxprojPath = path.join(iosDir, 'MyApp.xcodeproj', 'project.pbxproj');
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

/* Begin PBXFileReference section */
		APP_PRODUCT_UUID /* MyApp.app */ = {
			isa = PBXFileReference;
			explicitFileType = wrapper.application;
			includeInIndex = 0;
			path = MyApp.app;
			sourceTree = BUILT_PRODUCTS_DIR;
		};
/* End PBXFileReference section */

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
		EXT_TARGET_UUID /* ${DEFAULT_EXTENSION_NAME} */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = EXT_TARGET_CONFIG_LIST_UUID;
			buildPhases = (
				EXT_RESOURCES_PHASE_UUID /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = "${DEFAULT_EXTENSION_NAME}";
			productName = "${DEFAULT_EXTENSION_NAME}";
			productType = "com.apple.product-type.app-extension";
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
				EXT_TARGET_UUID /* ${DEFAULT_EXTENSION_NAME} */,
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
		EXT_RESOURCES_PHASE_UUID /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */
	};
	rootObject = PROJECT_UUID;
}
`;

fs.writeFileSync(pbxprojPath, pbxprojContent);

// Create a fake sound file
const soundPath = path.join(tmpDir, 'assets', 'chime.wav');
fs.mkdirSync(path.dirname(soundPath), { recursive: true });
fs.writeFileSync(soundPath, Buffer.from('RIFF fake wav content'));

// Build the config
const config = {
  name: 'MyApp',
  ios: {
    bundleIdentifier: 'com.test.myapp',
    buildNumber: '1',
  },
  version: '1.0.0',
};

const props = normalizeProps(config, {
  iosSoundFiles: ['./assets/chime.wav'],
  enableNotificationServiceExtension: true,
});

validateProps(props);

let failures = 0;
function check(label, condition, detail) {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures++;
    console.error(`FAIL: ${label}${detail ? ` (${detail})` : ''}`);
  }
}

// Mirror the disk-copy part of copyIOSSoundFiles' dangerous mod
const mainSoundsDir = path.join(iosDir, IOS_SOUNDS_DIR);
fs.mkdirSync(mainSoundsDir, { recursive: true });
fs.copyFileSync(soundPath, path.join(mainSoundsDir, 'chime.wav'));

// Drive the real plugin logic on the parsed project
const xcode = require('xcode');

function applySounds() {
  const proj = xcode.project(pbxprojPath);
  proj.parseSync();
  const appTarget = proj.pbxTargetByName(config.name);
  const extensionTarget = props.enableNotificationServiceExtension
    ? proj.pbxTargetByName(props.extensionName)
    : null;
  if (!appTarget || (props.enableNotificationServiceExtension && !extensionTarget)) {
    console.error('Targets not found in fixture');
    process.exit(1);
  }
  for (const sound of props.iosSoundFiles) {
    const fileName = path.basename(sound);
    addResourceFileToTarget(proj, fileName, appTarget, IOS_SOUNDS_DIR);
    if (extensionTarget) {
      addResourceFileToTarget(proj, fileName, extensionTarget, IOS_SOUNDS_DIR);
    }
  }
  fs.writeFileSync(pbxprojPath, proj.writeSync());
}

applySounds();

// Re-parse the persisted output so assertions run against what Xcode loads
const persisted = xcode.project(pbxprojPath);
persisted.parseSync();

const objects = persisted.hash.project.objects;

function unquote(value) {
  return typeof value === 'string' ? value.replace(/^"+|"+$/g, '') : value;
}

// The file reference must sit at the bundle root so it can be referenced by
// filename only at runtime
const fileRefs = objects.PBXFileReference || {};
const chimeRefKeys = Object.keys(fileRefs).filter(
  key => !key.endsWith('_comment') && unquote(fileRefs[key].path) === 'chime.wav',
);
check('file reference is a bare filename (bundle root)', chimeRefKeys.length === 1);

// The group must point at the physical ios/NotifeeSounds directory
const groups = objects.PBXGroup || {};
const soundGroups = Object.keys(groups).filter(
  key =>
    !key.endsWith('_comment') &&
    (unquote(groups[key].name) === IOS_SOUNDS_DIR || groups[key].path === IOS_SOUNDS_DIR),
);
const groupOk =
  soundGroups.length === 1 && (groups[soundGroups[0]].path === IOS_SOUNDS_DIR || unquote(groups[soundGroups[0]].name) === IOS_SOUNDS_DIR);
check(`group '${IOS_SOUNDS_DIR}' exists with matching path`, groupOk);

// The sound group must be attached to the main group so its relative
// path resolves
const mainGroupKey = persisted.getFirstProject().firstProject.mainGroup;
const mainChildren = (groups[mainGroupKey].children || []).map(c => c.value || c);
const soundGroupAttached = soundGroups.some(key => mainChildren.includes(key));
check(`'${IOS_SOUNDS_DIR}' group is a child of the main group`, soundGroupAttached);

check(
  `sound copied to disk under ios/${IOS_SOUNDS_DIR}/`,
  fs.existsSync(path.join(mainSoundsDir, 'chime.wav')),
);

// Both targets must link the sound into their own Resources build phase
function findObjectKeyByComment(section, name) {
  for (const key of Object.keys(section)) {
    if (!key.endsWith('_comment')) continue;
    if (section[key] === name) return key.slice(0, -'_comment'.length);
  }
  return null;
}

function resourcesFiles(targetName) {
  const targetKey = findObjectKeyByComment(objects.PBXNativeTarget, targetName);
  if (!targetKey) return [];
  const target = objects.PBXNativeTarget[targetKey];
  return (target.buildPhases || []).flatMap(entry => {
    const phaseKey = entry.value || entry;
    const phase = objects.PBXResourcesBuildPhase[phaseKey];
    return phase && phase.files ? phase.files.map(f => f.value || f) : [];
  });
}

const buildFiles = objects.PBXBuildFile || {};
function phaseHasChime(files) {
  return files.some(buildFileKey => {
    const bf = buildFiles[buildFileKey];
    return bf && bf.fileRef === chimeRefKeys[0];
  });
}

check('app target Resources phase includes chime.wav', phaseHasChime(resourcesFiles(config.name)));
check(
  'extension target Resources phase includes chime.wav',
  props.enableNotificationServiceExtension
    ? phaseHasChime(resourcesFiles(props.extensionName))
    : !phaseHasChime(resourcesFiles(props.extensionName)),
);

// One shared file reference, exactly one build file per enabled target,
// regardless of how many times the plugin ran
const chimeBuildFileKeys = Object.keys(buildFiles).filter(
  key => !key.endsWith('_comment') && buildFiles[key].fileRef === chimeRefKeys[0],
);
check('exactly one build file per target (no duplicates across passes)',
  props.enableNotificationServiceExtension ? chimeBuildFileKeys.length === 2 : chimeBuildFileKeys.length === 1,
  `found ${chimeBuildFileKeys.length}`);

if (process.env.DEBUG_PBXPROJ) {
  console.log('\n----- serialized project.pbxproj -----');
  console.log(fs.readFileSync(pbxprojPath, 'utf8'));
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
