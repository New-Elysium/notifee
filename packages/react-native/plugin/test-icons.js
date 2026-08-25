const path = require('path');
const fs = require('fs');
const os = require('os');
const { imageSize: getImageSize } = require('image-size');

const { normalizeProps, validateProps, isValidAndroidResourceName } = require('./utils');
const { saveIcon } = require('./android');
const {
  LARGE_ICON_SIZES,
  NOTIFICATION_ICON_NAME,
  RES_PATH,
  SMALL_ICON_SIZES,
} = require('./constants');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notifee-icons-test-'));

let failures = 0;
function check(label, condition, detail) {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures++;
    console.error(`FAIL: ${label}${detail ? ` (${detail})` : ''}`);
  }
}

// Fixture source asset: any valid PNG works because the plugin resizes it
const fixtureSource = path.resolve(__dirname, '../../../tests_react_native/assets/notifee-logo.png');
check('fixture PNG exists', fs.existsSync(fixtureSource));
if (!fs.existsSync(fixtureSource)) process.exit(1);

async function expectThrows(label, fn) {
  try {
    await fn();
    check(label, false, 'no error thrown');
  } catch (error) {
    check(label, error instanceof Error && error.message.length > 0, error.message);
  }
}

(async () => {
  // Small icon: one file per density bucket at exact pixel sizes
  await saveIcon(tmpDir, { name: 'test_small_icon', path: fixtureSource, type: 'small' });
  for (const folder of SMALL_ICON_SIZES) {
    const file = path.join(tmpDir, RES_PATH, folder.name, 'test_small_icon.png');
    if (!fs.existsSync(file)) {
      check(`${folder.name}/test_small_icon.png exists`, false);
      continue;
    }
    const dims = getImageSize(file);
    check(
      `${folder.name} is ${folder.size}px square`,
      dims.width === folder.size && dims.height === folder.size,
      `${dims.width}x${dims.height}`,
    );
  }

  // Large icon: single xxxhdpi asset
  await saveIcon(tmpDir, { name: 'test_large_icon', path: fixtureSource, type: 'large' });
  const largeFile = path.join(tmpDir, RES_PATH, LARGE_ICON_SIZES[0].name, 'test_large_icon.png');
  if (fs.existsSync(largeFile)) {
    const dims = getImageSize(largeFile);
    check(
      `large icon is ${LARGE_ICON_SIZES[0].size}px`,
      dims.width === LARGE_ICON_SIZES[0].size && dims.height === LARGE_ICON_SIZES[0].size,
      `${dims.width}x${dims.height}`,
    );
  } else {
    check('large icon generated', false);
  }

  // Re-running (repeat prebuild) overwrites in place without side effects
  await saveIcon(tmpDir, { name: 'test_small_icon', path: fixtureSource, type: 'small' });
  const smallDirs = SMALL_ICON_SIZES.map(f => f.name);
  const pngCount = smallDirs.filter(f =>
    fs.existsSync(path.join(tmpDir, RES_PATH, f, 'test_small_icon.png')),
  ).length;
  check('repeat run keeps exactly one file per density', pngCount === smallDirs.length);

  // The built-in notification icon name must remain a valid resource name
  check(
    `'${NOTIFICATION_ICON_NAME}' is a valid resource name`,
    isValidAndroidResourceName(NOTIFICATION_ICON_NAME),
  );

  // Config validation: invalid resource names and missing files are rejected
  for (const badName of ['My Icon', 'icAdd', '9icon']) {
    try {
      const props = normalizeProps(
        { name: 'MyApp', version: '1.0.0' },
        { androidIcons: [{ name: badName, path: './x.png', type: 'small' }] },
      );
      validateProps(props);
      check(`rejects invalid icon name '${badName}'`, false, 'no error thrown');
    } catch (error) {
      check(`rejects invalid icon name '${badName}'`, error.message.includes(badName));
    }
  }

  await expectThrows('rejects missing icon file', () =>
    saveIcon(tmpDir, { name: 'missing_icon', path: './nope.png', type: 'small' }),
  );

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
