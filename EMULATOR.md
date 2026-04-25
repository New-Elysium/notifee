# Emulator Setup and Usage Guide

This document outlines how to set up and use iOS and Android emulators for the Notifee project.

## Prerequisites

### iOS Development
- macOS required
- Xcode Command Line Tools (lightweight alternative to full Xcode)
- xtool for device management and app installation
- iOS Simulator runtime (for simulator testing)
- Optional: ios-sim for enhanced simulator control

### Android Development
- Android Studio installed OR Android SDK command-line tools
- Java Development Kit (JDK) 17 or later
- Android SDK platform-tools

## iOS Device Setup (Physical Devices)

### Installation and Setup

#### Option 1: xtool (Recommended - Cross-platform Xcode replacement)
xtool is a lightweight alternative to Xcode that can build, sign, and install iOS apps to physical devices. It's SwiftPM-based and fully declarative.

```bash
# Install xtool (if not already installed)
brew install xtool

# Set up xtool for iOS development
xtool setup

# Authenticate with Apple Developer Services
xtool auth login
```

**xtool Build Capabilities:**
- Build SwiftPM projects directly to `.app` or `.ipa` files
- Cross-platform support (macOS, Linux, Windows)
- No Xcode dependency for building
- Automatic code signing and provisioning

#### Option 2: Traditional Xcode Command Line Tools
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install additional device support tools
brew install libimobiledevice
```

### Building Apps with xtool

#### For SwiftPM Projects
xtool excels at building native SwiftPM projects:

```bash
# Create new SwiftPM project
xtool new MySwiftApp

# Build debug version
xtool dev build

# Build release version
xtool dev build --configuration release

# Build IPA directly
xtool dev build --configuration release --ipa

# Build and run in one command
xtool dev run
```

#### For React Native Projects (like Notifee)
React Native projects use Xcode build system, but xtool can still help:

```bash
# Option 1: Traditional React Native build + xtool install
cd ios/
xcodebuild -workspace notifeetestsreactnative.xcworkspace \
  -scheme notifeetestsreactnative \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath Notifee.xcarchive archive

xcodebuild -exportArchive \
  -archivePath Notifee.xcarchive \
  -exportPath ./build \
  -exportOptionsPlist ExportOptions.plist

# Install with xtool
xtool install ./build/notifeetestsreactnative.ipa

# Option 2: Generate Xcode project with xtool (experimental)
xtool dev generate-xcode-project
# Then use standard React Native build process
```

### Connecting and Managing Devices

#### List Connected Devices
```bash
# List all connected iOS devices
xtool devices

# List USB devices only
xtool devices --usb

# List network devices (WiFi sync enabled)
xtool devices --network

# Wait for devices to be connected
xtool devices --wait
```

#### Install Apps to Device
```bash
# Install IPA file to any connected device
xtool install /path/to/app.ipa

# Install to specific device by UDID
xtool install --udid 00008020-00010C181446002E /path/to/app.ipa

# Install to USB device only
xtool install --usb /path/to/app.ipa
```

#### Launch Installed Apps
```bash
# Launch app by bundle identifier
xtool launch com.example.app

# Launch app with arguments
xtool launch com.example.app --debug --verbose

# Launch on specific device
xtool launch --udid 00008020-00010C181446002E com.example.app
```

#### Uninstall Apps
```bash
# Uninstall app by bundle identifier
xtool uninstall com.example.app

# Uninstall from specific device
xtool uninstall --udid 00008020-00010C181446002E com.example.app
```

### Device Information and Debugging

#### Get Device Information
```bash
# Get device details using libimobiledevice
ideviceinfo

# Get specific device properties
ideviceinfo -k ProductVersion
ideviceinfo -k DeviceName
ideviceinfo -q "ProductType"
```

#### Monitor Device Logs
```bash
# Monitor device logs in real-time
idevicesyslog

# Filter logs for specific app
idevicesyslog | grep "com.example.app"
```

#### Take Screenshots
```bash
# Take screenshot
idevicescreenshot

# Save screenshot to specific path
idevicescreenshot /path/to/screenshot.png
```

## iOS Simulator Setup

### Installation

#### Option 1: Xcode Command Line Tools (Recommended - Lightweight)
Install only the command line tools without the full Xcode IDE:

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Or install without GUI (for automation)
touch /tmp/.com.apple.dt.CommandLineTools.installondemand.in-progress
PROD=$(softwareupdate -l | grep "\*.*Command Line" | head -n 1 | awk -F"*" '{print $2}' | sed -e 's/^ *//' | tr -d '\n')
softwareupdate -i "$PROD" -v
```

#### Option 2: Install iOS Simulator Runtime
After installing command line tools, download the simulator runtime:

```bash
# List available simulators
xcrun simctl list devices

# Download specific iOS runtime (example: iOS 17.0)
xcrun simctl runtime add "iOS 17.0"
```

#### Option 3: Enhanced Simulator Control with ios-sim
```bash
# Install ios-sim globally
npm install -g ios-sim

# This provides additional simulator management commands
```

### Running iOS Simulator

#### Option 1: Direct Command Line (Recommended)
```bash
# List available simulators
xcrun simctl list devices

# Boot a specific simulator
xcrun simctl boot "iPhone 15"

# Open Simulator app
open -a Simulator

# Or boot and open in one command
xcrun simctl boot "iPhone 15" && open -a Simulator
```

#### Option 2: Using ios-sim
```bash
# Show available device types
ios-sim showdevicetypes

# Show available SDKs
ios-sim showsdks

# Start simulator with specific device
ios-sim start --devicetypeid "iPhone 15, iOS 17.0"
```

#### Option 3: Via React Native CLI
```bash
# From project root
npx react-native run-ios --simulator="iPhone 15"
```

### Common iOS Simulator Commands
```bash
# List all available simulators
xcrun simctl list devices

# Install app on simulator
xcrun simctl install <device_udid> <app_path>

# Launch app
xcrun simctl launch <device_udid> <bundle_identifier>

# Using ios-sim for app management
ios-sim install <app_path>
ios-sim launch <app_path>

# Reset simulator content and settings
xcrun simctl erase all

# Shutdown all simulators
xcrun simctl shutdown all

# Take screenshots
xcrun simctl io <device_udid> screenshot <path_to_screenshot.png>

# Record video
xcrun simctl io <device_udid> recordVideo <path_to_video.mp4>

# Monitor simulator logs
xcrun simctl spawn <device_udid> log stream --predicate 'process == "SpringBoard"'
```

## Android Emulator Setup

### Installation

#### Option 1: Android Studio (Recommended)
1. Download and install Android Studio
2. Open Android Studio
3. Go to `Tools > AVD Manager`
4. Create new virtual device with desired configuration

#### Option 2: Command Line Tools
1. Install Android command-line tools:
   ```bash
   brew install --cask android-commandlinetools
   ```

2. Set environment variables:
   ```bash
   export ANDROID_SDK_ROOT=~/Library/Android/sdk
   export PATH=$PATH:$ANDROID_SDK_ROOT/emulator
   export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
   ```

3. Install required packages:
   ```bash
   sdkmanager "platform-tools" "platforms;android-34" "system-images;android-34;google_apis_playstore;x86_64"
   ```

### Running Android Emulator

#### Option 1: Android Studio AVD Manager
1. Open Android Studio
2. Go to `Tools > AVD Manager`
3. Click play button next to desired AVD

#### Option 2: Command Line
```bash
# List available AVDs
emulator -list-avds

# Start specific AVD
emulator -avd <avd_name>

# Start with specific options
emulator -avd <avd_name> -partition-size 2048 -memory 2048
```

### Creating New AVDs via Command Line
```bash
# List available system images
sdkmanager --list | grep "system-images"

# Create AVD
avdmanager create avd -n <device_name> -k "<system_image_path>" -d "<device_type>"

# Example:
avdmanager create avd -n Pixel_6_API_34 -k "system-images;android-34;google_apis_playstore;x86_64" -d "pixel_6"
```

## Notifee Project Specific Setup

### iOS Setup (Pure xtool Workflow - SwiftPM Projects)
For pure SwiftPM projects, you can use xtool end-to-end:

```bash
# Create and build SwiftPM project with xtool
xtool new MyNotifeeApp
cd MyNotifeeApp

# Build and install to device
xtool dev build --configuration release --ipa
xtool install ./build/MyNotifeeApp.ipa
xtool launch com.myapp.notifeeapp
```

### iOS Setup (React Native + xtool Install)
For React Native projects like Notifee, use traditional build + xtool install:

```bash
# Navigate to iOS directory
cd tests_react_native/ios/

# Install CocoaPods dependencies
pod install

# Build the app using React Native
cd ..
npx react-native run-ios --configuration=Release

# Find the built IPA and install with xtool
find . -name "*.ipa" -type f
xtool install ./path/to/built/app.ipa

# Launch the app
xtool launch com.notifeetestsreactnative.app
```

### iOS Setup (Command Line Tools + Simulator)
```bash
# Navigate to iOS directory
cd ios/

# Install CocoaPods dependencies
pod install

# Run on iOS simulator using command line
cd ..
npx react-native run-ios --simulator="iPhone 15"

# Or using xcrun directly
xcrun simctl boot "iPhone 15"
open -a Simulator
npx react-native run-ios
```

### Android Setup
```bash
# Navigate to Android directory
cd android/

# Clean and build
./gradlew clean

# Navigate back to root
cd ..

# Run on Android emulator/device
npx react-native run-android
```

## Troubleshooting

### iOS Issues

#### Simulator not launching
```bash
# Reset iOS Simulator
xcrun simctl shutdown all
xcrun simctl erase all
```

#### Build failures
```bash
# Clean iOS build
cd ios && xcodebuild clean && cd ..

# Reinstall pods
cd ios && rm -rf Pods && pod install && cd ..
```

### Android Issues

#### Emulator not found
```bash
# Check ANDROID_SDK_ROOT
echo $ANDROID_SDK_ROOT

# Verify emulator path
ls ~/Library/Android/sdk/emulator/emulator
```

#### "Cannot find AVD system path" error
```bash
# Verify system image exists
ls ~/Library/Android/sdk/system-images/

# Install missing system image
sdkmanager "system-images;android-34;google_apis_playstore;x86_64"
```

#### Insufficient disk space
```bash
# Check disk space
df -h

# Clean up Android build cache
cd android && ./gradlew clean && cd ..

# Remove unused AVDs
avdmanager delete avd -n <unused_avd_name>
```

#### "Failed to install APK" error
```bash
# Uninstall existing app
adb uninstall <package_name>

# Clean Android build
cd android && ./gradlew clean && cd ..

# Rebuild and run
npx react-native run-android
```

## Environment Setup

### Required Environment Variables
Add these to your shell profile (`~/.zshrc` or `~/.bash_profile`):

```bash
# iOS Development Tools (Command Line Tools)
export DEVELOPER_DIR=/Library/Developer/CommandLineTools

# Android SDK
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin

# Java (if not in default location)
export JAVA_HOME=/Applications/Android\ Studio.app/Contents/jbr/Contents/Home
```

### Verify Installation
```bash
# Check iOS tools
xcrun simctl list devices
xcrun --version

# Check xtool
xtool --version
xtool devices

# Check libimobiledevice tools (if installed)
idevice_id --version
idevicesyslog --version

# Check ios-sim (if installed)
ios-sim --version

# Check Android tools
adb version
emulator -version
avdmanager list avd
```

## Best Practices

1. **Use physical devices for testing notifications** - Emulators have limitations
2. **Keep emulators updated** - Regularly update system images
3. **Monitor disk space** - Android emulators can use significant space
4. **Use appropriate AVD configurations** - Match your target audience devices
5. **Clean regularly** - Remove unused AVDs and clean build caches
6. **Test on multiple API levels** - Ensure compatibility across Android versions

## Performance Tips

### iOS Simulator
- Use hardware acceleration (enabled by default)
- Close unnecessary simulator windows
- Reset simulator if it becomes slow

### Android Emulator
- Use x86_64 images for better performance
- Allocate adequate RAM (2GB minimum recommended)
- Use hardware acceleration via Intel HAXM or Hypervisor Framework
- Close other resource-intensive applications

## Testing Notifications

### iOS
- Use physical device for full notification testing
- Simulator can receive local notifications but has limitations
- Test push notifications via physical device

### Android
- Emulators can receive both local and push notifications
- Use Firebase Console or backend services for push notification testing
- Test notification channels, permissions, and interactions

## Resources

- [React Native Environment Setup](https://reactnative.dev/docs/environment-setup)
- [xtool - Cross-platform Xcode replacement](https://github.com/xtool-org/xtool)
- [Xcode Command Line Tools Installation](https://mokacoding.com/blog/how-to-install-xcode-cli-tools-without-gui/)
- [libimobiledevice - iOS Device Communication](https://github.com/libimobiledevice/libimobiledevice)
- [ios-sim - iOS Simulator Launcher](https://github.com/ios-control/ios-sim)
- [xcrun simctl Documentation](https://nshipster.com/simctl/)
- [Android Studio Documentation](https://developer.android.com/studio)
- [Notifee Documentation](https://notifee.app/react-native/docs)
