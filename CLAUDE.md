# CLAUDE.md

Project instructions live in [AGENTS.md](./AGENTS.md).

## Local Development Hardware (quick reference)

The dev workstation is an **x86_64 macOS host (Darwin 26.4) with an AMD Ryzen 9 6900HS CPU**.

- Apple **Hypervisor.framework (HVF) is unavailable** here: `sysctl kern.hv_support` returns `0`. HVF requires an Intel CPU with VT-x, EPT and Unrestricted Guest support.
- `emulator -accel-check` misleadingly prints `accel: 0` ("Hypervisor.Framework OS X Version 26.4"). This is a **false positive** — the emulator engine actually fails at `-enable-hvf` with `HVF error: HV_ERROR` / `failed to initialize HVF`.
- Android AVDs therefore run under **QEMU TCG software emulation**: launch them with `-no-accel`, and keep using **x86_64** system images. Do **not** switch to an arm64 image — Rosetta 2 is Apple-silicon only, so arm64 would also fall back to TCG (slower than x86_64 TCG) and needs a ~1.5 GB download.

See [AGENTS.md](./AGENTS.md) for the full note and verification commands.
