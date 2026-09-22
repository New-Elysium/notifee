# CLAUDE.md

Project instructions live in [AGENTS.md](./AGENTS.md).

## Local Development Hardware (quick reference)

The dev workstation is an **x86_64 macOS host (Darwin 26.4) with an AMD Ryzen 9 6900HS CPU**.

- Apple **Hypervisor.framework (HVF) is unavailable** here: `sysctl kern.hv_support` returns `0`. HVF requires an Intel CPU with VT-x, EPT and Unrestricted Guest support.
- `emulator -accel-check` misleadingly prints `accel: 0` ("Hypervisor.Framework OS X Version 26.4"). This is a **false positive** — the emulator engine actually fails at `-enable-hvf` with `HVF error: HV_ERROR` / `failed to initialize HVF`.
- Android AVDs therefore run under **QEMU TCG software emulation**: launch them with `-no-accel`, and keep using **x86_64** system images. Do **not** switch to an arm64 image — Rosetta 2 is Apple-silicon only, so arm64 would also fall back to TCG (slower than x86_64 TCG) and needs a ~1.5 GB download.
- Local Android testing happens on the **physical OnePlus 9R over Wi-Fi adb** (`adb connect <ip>:<port>` + `adb reverse tcp:8081`), not the emulator.

## Example app (quick reference)

The smoke test app runs `react ^19.3.0` + `react-native 0.87.1` (Fabric-only). Watch out for:

- **Metro singleton pin** in `example/metro.config.js` — without it a second `react-native@0.83.x` from the repo-root Bun store gets bundled → two `AppRegistry`s → black screen with `"example" has not been registered`.
- **iOS pods**: install with `RCT_USE_PREBUILT_RNCORE=0` (the prebuilt core tarball is missing `ReactNativeHeaders.xcframework` here).
- **Android**: Gradle 9.4.1+, `android.builtInKotlin=false`/`android.newDsl=false`, Kotlin 2.2.0, `proguard-android-optimize.txt`.

See [AGENTS.md](./AGENTS.md) for the full note and verification commands.
