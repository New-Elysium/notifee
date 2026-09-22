const fs = require('fs');
const os = require('os');
const path = require('path');

// 'xcode' is a devDependency of the RN package, not of the test workspace —
// resolve it from there explicitly.
const xcode = require(require.resolve('xcode', {
  paths: [path.join(__dirname, '..', '..', 'packages', 'react-native')], // eslint-disable-line import/no-dynamic-require
}));

const {
  addResourceFileToTarget,
  resolveAppTargetKey,
  resolveExtensionTargetKey,
} = require('../../packages/react-native/plugin/ios'); // eslint-disable-line import/no-dynamic-require

// The example app's real project file — a known-good pbxproj whose single
// native target is named "example". Tests simulate the common CNG mismatch:
// app.json `name` (display name) differs from the Xcode target name.
const EXAMPLE_PBXPROJ = path.join(
  __dirname,
  '..',
  '..',
  'example',
  'ios',
  'example.xcodeproj',
  'project.pbxproj',
);

function loadProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notifee-plugin-'));
  const projectPath = path.join(dir, 'project.pbxproj');
  fs.copyFileSync(EXAMPLE_PBXPROJ, projectPath);

  const project = new xcode.project(projectPath);
  project.parseSync();
  return project;
}

describe('plugin/ios target resolution', () => {
  describe('resolveAppTargetKey', () => {
    it('resolves the app target via modRequest.projectName (Expo-idiomatic field)', () => {
      const project = loadProject();

      const resolved = resolveAppTargetKey(project, {
        name: 'Notifee Lab',
        modRequest: { projectName: 'example' },
      });

      expect(resolved).not.toBeNull();
      expect(resolved.name).toBe('example');
    });

    it('resolves via the mod config display name when it matches the target', () => {
      const project = loadProject();

      const resolved = resolveAppTargetKey(project, {
        name: 'example',
        modRequest: { projectName: 'example' },
      });

      expect(resolved).not.toBeNull();
      expect(resolved.name).toBe('example');
    });

    it('falls back to the first target when neither name matches (renamed targets)', () => {
      const project = loadProject();

      const resolved = resolveAppTargetKey(project, {
        name: 'Totally Different Display Name',
        modRequest: { projectName: 'AlsoDifferent' },
      });

      expect(resolved).not.toBeNull();
      expect(resolved.name).toBe('example');
    });

    it('returns null when the project has no targets', () => {
      const project = loadProject();
      project.getFirstProject().firstProject.targets = [];
      const objects = project.hash.project.objects;
      for (const key of Object.keys(objects.PBXNativeTarget)) {
        if (!key.endsWith('_comment')) {
          delete objects.PBXNativeTarget[key];
          delete objects.PBXNativeTarget[`${key}_comment`];
        }
      }

      const resolved = resolveAppTargetKey(project, {
        name: 'Notifee Lab',
        modRequest: { projectName: 'example' },
      });

      expect(resolved).toBeNull();
    });
  });

  describe('resolveExtensionTargetKey', () => {
    it('finds a target by exact name', () => {
      const project = loadProject();

      const resolved = resolveExtensionTargetKey(project, 'example');

      expect(resolved).not.toBeNull();
      expect(resolved.name).toBe('example');
    });

    it('returns null when the target does not exist', () => {
      const project = loadProject();

      expect(resolveExtensionTargetKey(project, 'MissingExtension')).toBeNull();
    });
  });

  describe('addResourceFileToTarget', () => {
    it('links a sound into the resolved target Resources phase (regression: sounds must not be silently skipped)', () => {
      const project = loadProject();
      const appTarget = resolveAppTargetKey(project, {
        name: 'Notifee Lab',
        modRequest: { projectName: 'example' },
      });

      addResourceFileToTarget(project, 'chime-test.wav', appTarget, 'NotifeeSounds');

      const resourcesPhase = project.buildPhaseObject(
        'PBXResourcesBuildPhase',
        'Resources',
        appTarget.key,
      );
      const linked = resourcesPhase.files.some(entry => {
        const buildFile = project.hash.project.objects.PBXBuildFile[entry.value];
        if (!buildFile) return false;
        const fileRef = project.hash.project.objects.PBXFileReference[buildFile.fileRef];
        return fileRef && fileRef.path === '"chime-test.wav"';
      });
      expect(linked).toBe(true);
    });

    it('is idempotent across repeated prebuilds', () => {
      const project = loadProject();
      const appTarget = resolveAppTargetKey(project, {
        name: 'Notifee Lab',
        modRequest: { projectName: 'example' },
      });

      addResourceFileToTarget(project, 'chime-test.wav', appTarget, 'NotifeeSounds');
      addResourceFileToTarget(project, 'chime-test.wav', appTarget, 'NotifeeSounds');

      const resourcesPhase = project.buildPhaseObject(
        'PBXResourcesBuildPhase',
        'Resources',
        appTarget.key,
      );
      const linkedEntries = resourcesPhase.files.filter(entry => {
        const buildFile = project.hash.project.objects.PBXBuildFile[entry.value];
        if (!buildFile) return false;
        const fileRef = project.hash.project.objects.PBXFileReference[buildFile.fileRef];
        return fileRef && fileRef.path === '"chime-test.wav"';
      });
      expect(linkedEntries).toHaveLength(1);
    });
  });
});
