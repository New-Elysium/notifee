#!/bin/bash
set -e
echo "Please ensure you run this from the packages/react-native directory inside the cloned psync/notifee repo"
echo "You should only do this when your git working set is completely clean (e.g., git reset --hard)"
echo "You must have already run \`bun install\` in the repository so CLI tools work"
echo "This scaffolding refresh has been tested on macOS, not on windows or linux"

# Copy the important files out temporarily
if [ -d TEMP ]; then
  echo "TEMP directory already exists - we use that to store files while refreshing."
elif [ -d example ]; then
  echo "Saving files to TEMP while refreshing scaffolding..."
  mkdir -p TEMP/android
  mkdir -p TEMP/android/app/src/main/java/com/example
  cp example/README.md TEMP/
  cp example/android/app/src/main/java/com/example/CustomActivity.java TEMP/android/app/src/main/java/com/example/

  cp -R example/src TEMP/
  cp example/App.tsx TEMP/
  cp -R example/__tests__ TEMP/
fi

# Purge the old sample
\rm -fr example

# Make the new example using the modern Community CLI and bun
echo "Creating example app"
npx @react-native-community/cli@~0.83.2 init example --pm bun
pushd example

# Update package.json
echo "Adding Notifee app package"
# add notifee dependency
npx json -I -f package.json -e 'this.dependencies["@psync/notifee"] = "file:../"'
# add post install step for notifee using bun
npx json -I -f package.json -e 'this.scripts.postinstall = "cd node_modules/@psync/notifee && bun install"'

# Update SDK Versions (React Native 0.83+ / Android 16 targets API 36)
echo "Updating android/build.gradle"
sed -i "" -e 's/compileSdkVersion = [0-9]*/compileSdkVersion = 36/' android/build.gradle
sed -i "" -e 's/targetSdkVersion = [0-9]*/targetSdkVersion = 36/' android/build.gradle

echo "Updating AndroidManifest.xml"
sed -i "" -e $'s/android:name=".MainActivity"/android:name=".MainActivity"\\\n      android:showWhenLocked="true"\\\n        android:turnScreenOn="true"/;s/\<\/activity\>/\<\/activity\>\\\n      \<activity\\\n        android:name="com.example.CustomActivity"\\\n      android:showWhenLocked="true"\\\n      android:turnScreenOn="true"\\\n    \/\>/' android/app/src/main/AndroidManifest.xml

echo "Updating MainActivity.java"
# Note: Modern RN generates MainActivity in kotlin (.kt), but keeping .java fallback just in case
if [ -f android/app/src/main/java/com/example/MainActivity.kt ]; then
  sed -i "" -e $'s/package com.example/package com.example\\\nimport io.invertase.notifee.NotifeeApiModule/;s/return "example"/return NotifeeApiModule.getMainComponent("example")/' android/app/src/main/java/com/example/MainActivity.kt
elif [ -f android/app/src/main/java/com/example/MainActivity.java ]; then
  sed -i "" -e $'s/package com.example;/package com.example;\\\nimport io.invertase.notifee.NotifeeApiModule;/;s/return "example"/return NotifeeApiModule.getMainComponent("example")/' android/app/src/main/java/com/example/MainActivity.java
fi

echo "Updating iOS Podfile"
# This is just a speed optimization, very optional, but asks xcodebuild to use clang and clang++ without the fully-qualified path
sed -i "" -e $'s/react_native_post_install(installer)/react_native_post_install(installer)\\\n\\\n    installer.pods_project.targets.each do |target|\\\n      target.build_configurations.each do |config|\\\n        config.build_settings["CC"] = "clang"\\\n        config.build_settings["LD"] = "clang"\\\n        config.build_settings["CXX"] = "clang++"\\\n        config.build_settings["LDPLUSPLUS"] = "clang++"\\\n      end\\\n    end/' ios/Podfile

echo "Installing pods"
pushd ios
bundle install || echo "Bundle install failed, continuing anyway..."
bundle exec pod install || pod install
popd

# We use typescript and there are linter collisions with transitive dependencies on old versions
# Merge the result of a PR we made upstream so lint is clean even with our 3-deep layer of packages
bun add -d @react-native-community/eslint-config@^3

bun install

# Copy the important files back in
popd
echo "Copying notifee example files into refreshed example..."
cp -frv TEMP/* example/

# Clean up after ourselves
\rm -fr TEMP
