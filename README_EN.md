<p align="center">
  <img src="AppScope/resources/base/media/startIcon.png" alt="OHVault Logo" width="120" />
</p>

<h1 align="center">OHVault</h1>

<p align="center">
  <strong>An unofficial HarmonyOS PC adaptation layer for Obsidian</strong>
</p>

<p align="center">
  A community fork that lets the official Obsidian application package run on the HarmonyOS native runtime.<br/>
  This repository contains the adaptation layer and original icon artwork only —<br/>
  <strong>it does not include or distribute any Obsidian code or assets.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HarmonyOS-6.1.0%2823%29-blue" alt="HarmonyOS 6.1.0(23)" />
  <img src="https://img.shields.io/badge/ArkTS-API%2023-orange" alt="ArkTS API 23" />
  <img src="https://img.shields.io/badge/adapted%20for-Obsidian%201.15.0-purple" alt="Adapted for Obsidian 1.15.0" />
  <img src="https://img.shields.io/badge/fork%20of-OHSidian-lightgrey" alt="Fork of OHSidian" />
  <img src="https://img.shields.io/badge/unofficial%20project-not%20affiliated-red" alt="Unofficial, not affiliated" />
</p>

> **Up front:** OHVault is not an official HarmonyOS build of Obsidian. It has no affiliation with, sponsorship by,
> or endorsement from the Obsidian rights holders or from Huawei. It is a third-party platform adaptation layer, and
> OHVault is the name you will see in your app list, status bar and window titles.

---

## Table of contents

- [What this project is, and what it is not](#what-this-project-is-and-what-it-is-not)
- [On the name and the artwork](#on-the-name-and-the-artwork)
- [Lineage](#lineage)
- [What this repository changes](#what-this-repository-changes)
- [Build and run](#build-and-run)
- [Integrity of the Obsidian application package](#integrity-of-the-obsidian-application-package)
- [License and attribution](#license-and-attribution)
- [Known limitations](#known-limitations)
- [Acknowledgements](#acknowledgements)

---

## What this project is, and what it is not

| This project **is** | This project **is not** |
|---|---|
| A **runtime adaptation layer** repository for HarmonyOS PC (2in1) and tablet | Part of Obsidian, and not an official or authorized edition of it |
| A **community fork** of the upstream OHSidian port, tracking the 1.15.0 application package | A reimplementation or replacement of Obsidian |
| A set of **fixes** for window chrome, status bar and delete semantics on HarmonyOS PC | A crack, activator, or anything that bypasses license checks or paywalls |
| Glue code whose only job is to make the official package start and behave on this machine | Decompiled output, a modified application build, or a distribution channel for it |
| The author of its own **icon artwork** | Any artwork taken from Obsidian or another third party |

In one sentence: **the official Obsidian package, unaltered, is loaded by the Electron-compatible runtime this repository provides**, and Obsidian itself never needs to know that the platform underneath is HarmonyOS. Every addition this fork makes lives in the bootstrapper this repository maintains, not in the application package.

On permissions: the terms that govern your use of Obsidian are agreed **between you and its official distributor**. This project neither grants you rights in Obsidian nor claims the ability to. Whether commercial use, sync or paid features are available to you is decided by the official terms, not by this repository. This project concerns one layer only: running on HarmonyOS.

---

## On the name and the artwork

The product name (OHVault), the bundle name (`com.niangao.ohvault`) and every icon are chosen by this project — none are inherited from upstream or from the official product. The reasons:

1. **No source confusion.** The name in the app list, status bar and window title is OHVault, so nothing here can be mistaken for an official Obsidian HarmonyOS release. Obsidian is named only as the *adaptation target*, never as the product name.
2. **No free-riding on someone else's marks.** Launcher icons, the status-bar glyph and all localized labels were replaced with an original mark. The project name OHVault = OH (OpenHarmony / HarmonyOS) + Vault (the generic term for a note repository); it does not allude to any existing trademark.

How trademarks are used here: Obsidian, HarmonyOS, Huawei and other names and identifiers belong to their respective owners. This repository refers to them **nominatively** — to identify the adaptation target and the runtime platform — not as source-identifying trademark use, and not to indicate origin.

---

## Lineage

Three layers, of which this fork is the bottom one:

```
HarmonyOS Electron runtime   ← the OpenHarmony Electron port: ArkTS adapters + libadapter.so
        ↓
OHSidian                   ← the community port that wires an Electron app into that runtime (this fork's baseline)
        ↓
OHVault (this repository)  ← tracks the 1.15.0 package; HarmonyOS PC fixes and original branding
```

**This README deliberately does not restate how the runtime or the upstream port works.** Engine internals (the ~50 adapters, JSBind registration, the C++ library, the dependency-injection structure, the cloud-sync implementation) are documented upstream; they are not this repository's original work, and they are not what this fork maintains or commits to. Below is only what this repository actually changed relative to its baseline, and why.

---

## What this repository changes

Everything sits in one of two places: the bootstrapper this repository maintains at `web_engine/src/main/resources/resfile/resources/app/main.js` (plus the three renderer-side patches that live next to it: `es5-plugin-compat.js`, `harmony-diagram-theme.js`, `harmony-diag.js`), and the HarmonyOS-side resources and build configuration. Not one line goes into Obsidian's application package.

The three headline fixes of this round: **plugin loading** (1.15.0 turned the plugin base classes into native classes, so ES5-compiled plugins fail the moment they load), **diagram text in dark mode** (the label colour chain of Pelé can be cut by a theme or a snippet, so the labels that genuinely cannot be read are repainted), and **renderer-side diagnostics** (errors thrown inside the renderer were invisible in hilog; now they are not).

| # | Change | Where | Why it is done this way |
|---|--------|-------|-------------------------|
| 1 | Track application package 1.15.0 | [resources/app/package.json](web_engine/src/main/resources/resfile/resources/app/package.json) | Version alignment; the package itself is supplied by the user (see below) |
| 2 | 132 px reserved for the caption buttons | [main.js:124](web_engine/src/main/resources/resfile/resources/app/main.js#L124) | HarmonyOS PC draws its own maximize/minimize/close buttons over the top-right corner of a **frameless** window. Obsidian only reserves that space under `body.mod-windows` / `mod-linux`, and this runtime reports `process.platform` as `openharmony`, so neither class is ever added and `--frame-right-space` stays empty — the tab strip slides under the buttons. Injected at runtime as 132 px (measured: 3 buttons at a 42 px pitch + a 12 px right inset − the 8 px Obsidian already adds on top of the variable) |
| 3 | Popout windows fall back to an in-window modal | [main.js:145](web_engine/src/main/resources/resfile/resources/app/main.js#L145), [main.js:176](web_engine/src/main/resources/resfile/resources/app/main.js#L176) | Settings opens via `window.open("about:blank", "_blank", "popup,…")`, a window this platform cannot create (`startAbility` → 16000067): the modal lands in a surface that never shows, `workspace.activeWindow` keeps pointing at it, and the sidebar toggles go dead. Returning `{action:'deny'}` for popup requests in the **main process** makes `window.open` return `null`, which is exactly the condition Obsidian itself checks before falling back to an in-window modal. It has to be the main process: overriding `window.open` from a renderer script gets clobbered, because the vault bootstrap reassigns it after DOMContentLoaded |
| 4 | Persistent status-bar icon | [main.js:383](web_engine/src/main/resources/resfile/resources/app/main.js#L383), [app/tray-icon.png](web_engine/src/main/resources/resfile/resources/app/tray-icon.png) | Obsidian never creates a `Tray`, so once the window is hidden there is no sign the app is alive. `electron.Tray` rides the runtime's existing path into the status bar. The glyph is 24×24 white line art on transparent alpha (this device has a dark bar); it keeps the part of the launcher mark that still holds up at that size — the hexagon and the three dots — and drops the interlocked apex rings, which turn to mud at 24 px. The instance must stay referenced at module scope or it is collected and the icon silently disappears |
| 5 | Deletes fall back into the vault's `.trash` | [main.js:463](web_engine/src/main/resources/resfile/resources/app/main.js#L463)–[main.js:507](web_engine/src/main/resources/resfile/resources/app/main.js#L507) | On this device the native `shell.trashItem` **reports success while leaving the file in place** (FUSE / xattr limits). Obsidian trusts the return value, so the user sees a "deleted" file that is still there. Success is now accepted only once the target is confirmed gone; otherwise the file is moved into the owning vault's `.trash`. Vault ownership is resolved by longest-prefix match against the vault table in `obsidian.json`, then by walking up looking for a `.obsidian` directory |
| 6 | Disable desktop update assumptions | [main.js:94](web_engine/src/main/resources/resfile/resources/app/main.js#L94) | This port cannot download a binary and relaunch, so `updateDisabled=true` stops the app hanging on "checking for updates". The same function also clears `frame=native` — that mode puts the vault path in a system title bar, the opposite of what this fork wants on screen |
| 7 | Build and credential hygiene | `.gitignore`, `build-profile.example.json5`, `electron/src/main/module.json5.example` (neither `build-profile.json5` nor `module.json5` is committed) | Target SDK raised to 6.1.0(23); `build-profile.json5` (signing passwords), `module.json5` (your AGC `client_id`), `*.p12/p7b/cer/keystore/jks` and `agconnect-services.json` are excluded, and the repository carries only credential-free examples. The Electron runtime binaries and the application package are excluded too (steps 2 and 4 below), so what is versioned is the adaptation-layer source, the config templates and the original artwork |
| 8 | Opt-in self-test for the delete fallback | [main.js:511](web_engine/src/main/resources/resfile/resources/app/main.js#L511), [main.js:548](web_engine/src/main/resources/resfile/resources/app/main.js#L548) | Because the fallback moves files, it ships with a **default-off** self-test: it runs only if a `harmonyos-trash-test.enabled` marker file exists in the app directory, deletes one temporary file inside a throwaway fake vault, then restores `obsidian.json` and removes the temporary directory. No user data is touched |
| 9 | Plugins load again under ES5 build output | [es5-plugin-compat.js](web_engine/src/main/resources/resfile/resources/app/es5-plugin-compat.js), [main.js:220](web_engine/src/main/resources/resfile/resources/app/main.js#L220) | Obsidian 1.15.0 turned the plugin base classes into native ES6 classes (`Plugin = class extends Component`). A plugin compiled by TypeScript with an ES5 target inherits through the `__extends` helper, whose constructor calls the base class **as a function** (`_super.apply(this, arguments)`); a native class refuses that with `Class constructor X cannot be invoked without 'new'`, and Obsidian turns the rejection into "plugin failed to load". The shim hands plugins a copy of the `obsidian` module in which every class is wrapped in a Proxy: `new`, `extends`, `instanceof` and the static members keep their native behaviour, and only the call-without-new form is intercepted, turned into a real construction whose own properties are copied back onto the caller's object. Obsidian delivers plugins along two paths — a `<script>` element on desktop, and a `window.eval` fallback — and both are covered |
| 10 | Diagram text is legible in dark mode | [harmony-diagram-theme.js](web_engine/src/main/resources/resfile/resources/app/harmony-diagram-theme.js), [main.js:290](web_engine/src/main/resources/resfile/resources/app/main.js#L290) | 1.15.0 swapped the diagram engine from mermaid.js to Pelé (`lib/mermaid.min.js` is gone, `lib/pele.min.js` is now referenced). Label colour travels the chain `--pele-fg → --mermaid-text-color → --text-normal`, while Pelé carries its own `#1f1f1f` fallback inline on the `<svg>`: if any link in that chain is overridden by a theme or a snippet — or the theme paints `svg text` directly — labels turn black on a dark background. The fix has two layers: first the theme's own text colour is resolved into a **literal** and written into `--pele-fg` (high specificity + `!important`, cutting the chain), then everything is re-checked by contrast and **only the labels that really cannot be read** are repainted — node labels use the node fill as their backdrop, edge labels the page background, so a light node automatically gets dark text; pie slices, axis labels and the explicit colours of `classDef` are left alone. Switching between light and dark recomputes everything |
| 11 | Renderer-side diagnostic probe | [harmony-diag.js](web_engine/src/main/resources/resfile/resources/app/harmony-diag.js), [main.js:254](web_engine/src/main/resources/resfile/resources/app/main.js#L254), [main.js:317](web_engine/src/main/resources/resfile/resources/app/main.js#L317) | Only the main process reaches hilog on this runtime, so an error thrown by Pelé or Obsidian inside the renderer is invisible — the symptom is a diagram stuck on its source text, which looks like a syntax problem. The adaptation layer forwards renderer console output and logs the **actual values** behind the diagram: resolved CSS variables, computed label colours, and every stylesheet rule that defines those variables together with its selector (that last one identifies which rule in the theme or snippet is changing the colour). Every 5 seconds, and only when the snapshot changes |

A few implementation choices worth calling out — they are posture, not features:

- Changes 2, 3, 9 and 10 are **runtime injections**. Nothing is edited inside the application package, which keeps that package byte-identical to the official release and means a version bump does not require re-applying patches.
- Change 3 has **no platform gating** — it is not "enabled only on certain platforms". A platform switch was tried and proved more expensive to maintain and harder to reproduce bugs against; it now applies unconditionally.
- Change 10 only repairs what genuinely cannot be read: the colours the diagram chose for itself (`classDef`, pie slices, axis labels) have to survive, and a single fixed colour would paint over them.

---

## Build and run

### Requirements

| Tool | Version |
|------|---------|
| DevEco Studio | **6.1.5 Preview** (build 6.1.5.408, on BitFun Platform 0.38.1-B661; ships hvigor `6.23.18-next`, toolchains `6.1.0.105`) |
| HarmonyOS SDK | **6.1.0(23) / API 23** (both `compileSdkVersion` and `compatibleSdkVersion`) |
| Hvigor | `6.23.18-next` (comes with the IDE, nothing to install separately; the `modelVersion: 5.0.0` in `hvigor-config.json5` is the build-model version, **not** the IDE version — don't read it as an environment requirement) |
| Target devices | 2in1, tablet (tested on 2in1 only, density 2.0, dark mode) |

The build here used a **Preview IDE**, so the versions above record how these artifacts were produced rather than promise a supported environment: a released DevEco Studio build, or a different SDK patch level, is unverified for this project, and a difference under those conditions is not automatically a bug in this repository.

### Steps

```bash
# 1. Signing configuration (never commit credentials; .gitignore excludes build-profile.json5)
cp build-profile.example.json5 build-profile.json5
#    then fill in your own certificate, profile and keystore paths

# 2. Fetch the Electron runtime binaries (not distributed here: libelectron.so alone is 160 MB,
#    over GitHub's hard 100 MB per-file limit). Put them back at the same paths in this project.
#    Source = the repository this fork is based on; LFS content is served over media.githubusercontent.com,
#    e.g. https://media.githubusercontent.com/media/HanversionOvO/OHSidian/main/<path-in-repo>
#    Files needed:
#      electron/libs/arm64-v8a/   libelectron.so  libadapter.so  libffmpeg.so  libextractor.so  libc++_shared.so
#      web_engine/src/main/resources/resfile/
#                                 icudtl.dat  resources.pak  chrome_100_percent.pak  chrome_200_percent.pak
#                                 snapshot_blob.bin  v8_context_snapshot.bin  style_font_config.json  electron
#                                 locales/en-US.pak  locales/zh-CN.pak
#                                 vulkan/icd.d/vk_swiftshader_icd.json

# 3. Module configuration (contains your own AGC client_id; module.json5 is gitignored as well)
cp electron/src/main/module.json5.example electron/src/main/module.json5
#    then replace client_id with the value issued to your app in AppGallery Connect

# 4. Place the Obsidian application package that you obtained yourself
#    destination: web_engine/src/main/resources/resfile/resources/app/obsidian.asar
#    (this repository does not distribute that file — see the next section)

# 5. Optional: put back two runtime dependencies (not distributed here: both npm packages
#    are marked UNLICENSED, so there is no grant to redistribute them)
#    destination: web_engine/src/main/resources/resfile/resources/app/node_modules/
#                 btime/   get-fonts/
#    They are dependencies the Obsidian application package declares itself. The app loads
#    both through a guarded require, so a runtime without them still starts — it only loses
#    the birth-time write and the system font listing.

# 6. Build
hvigorw assembleHap
#    output: electron/build/outputs/default/electron-default-signed.hap
```

You can also open the project in DevEco Studio and use **Build > Build HAP(s)**.

For Huawei capabilities (Account Kit, Cloud Foundation, …) create the app in AppGallery Connect, place `agconnect-services.json` in `electron/src/main/resources/rawfile/`, and set `client_id` in `module.json5` to the value of that app. `agconnect-services.json` contains keys, and both it and `module.json5` are gitignored. If you use no Huawei services, the placeholder `client_id` still builds.

### Update packages

The bootstrapper supports swap-in updates: put `obsidian-<version>.asar` in the app's userData directory (alongside `obsidian.log` on the device) and it is polled hourly, with a replacement only when the version is higher (logic starting at [main.js:929](web_engine/src/main/resources/resfile/resources/app/main.js#L929)). This channel **moves complete official packages only** — nothing is split, patched or rewritten.

---

## Integrity of the Obsidian application package

This section states the promise this repository wants anyone to be able to check for themselves: **we do not modify Obsidian's application package.**

- This repository **does not distribute** Obsidian's application code, its asar package, or any internal asset. Step 4 above asks you to obtain it from obsidian.md yourself; `*.asar` and `*.asar.gz` are both gitignored, as is the built `*.hap`. The one exception is the application package's own `resources/app/package.json` — Electron metadata: its `name` stays as it is (it determines the userData directory, and renaming it would relocate the user's data), while its `description` now describes this adaptation layer.
- The Electron / Chromium runtime is not in this repository either: the files under `electron/libs/` and the runtime files under `resfile` are fetched as in step 2. Their source is the repository this fork is based on — this repository neither re-hosts them nor promises anything about their availability.
- The package you place here is not altered by this project's build: all adaptation code lives in `main.js` and on the ArkTS side, and takes effect through public Electron APIs at runtime.
- Hashes of the package built in here, so you can compare against whatever you download: current 1.15.0 — `sha256 0e6383301078a798f0f3bdb42bdb606d904ada77eab8c8fc89da533573979248`, 24553884 bytes; previous 1.14.5 — `sha256 3a349274f789b62c5b35ad19de10311909a94e8783033569c2210a4bac491780`, 28177896 bytes; earlier 1.14.4 — `sha256 146ef8470d8cbb4a6db209bdc19bf2bad13350444186c0fd93c31087b142b92f`, 27477966 bytes, and that one **has been checked byte-for-byte against the official release**.
  Anyone can compute the same hash over the package they downloaded from the official source; a match demonstrates that this project tampers with nothing inside the application. The 1.15.0 and 1.14.5 checks have not been done (this machine only has the packages the user put in), so treat them as pending rather than confirmed against official.
- This project contains, and will accept no contribution containing, anything that bypasses license checks, provides activation, or resets trials. Obsidian's core use — managing your own Markdown files locally — needs nothing from this project at all.

---

## License and attribution

- **This repository's code** is forked from OHSidian, published upstream under the BSD 3-Clause License. Its copyright notice is retained as that license requires:
  `Copyright (c) 2023-2025, Haitai FangYuan Co., Ltd.`. The additions made by this fork are distributed on the same terms, insofar as they do not conflict with the upstream license. The full license text is in [LICENSE](LICENSE).
- **Obsidian** grants no rights to this project, and this project grants you no rights in Obsidian. Obsidian and its iconography belong to their respective owners.
- **Electron**, `@electron/remote`, **InversifyJS** and `reflect-metadata` are under the MIT License.
- **`btime` and `get-fonts`** are runtime dependencies that the Obsidian application package declares itself. Both npm packages are marked UNLICENSED (no license means all rights reserved by default), so they are **not distributed by this repository** — fetch them yourself as in step 5 of the build steps.
- **The HarmonyOS Electron runtime binaries** (`libelectron.so`, `libadapter.so`, the Chromium resources and so on) are not distributed by this repository — users fetch them themselves following the build steps. This project neither repackages, mirrors, nor modifies them.
- **HarmonyOS SDK / DevEco / AGC components** are subject to the Huawei developer agreements.
- **Icon artwork** (launcher icons and the status-bar glyph) is original to this project. The Obsidian iconography used by the upstream project survives only in the maintainer's local backup and ships in no branch or release artifact of this repository.

---

## Known limitations

Listed so that none of this reads as "that should already work":

- **Left-click on the status-bar icon is not wired.** The `statusBarIconClick` callback was never observed on this device (a second project on the same runtime reproduces the same result). Left-click UI needs the ArkTS `StatusBarViewExtensionAbility` route; the shells already exist: [StatusBarEntryAbility.ets](electron/src/main/ets/entryability/StatusBarEntryAbility.ets) and an empty [StatusBarPage.ets](electron/src/main/ets/pages/StatusBarPage.ets).
- **No tooltip.** The adapter's `SetToolTips` only stores the string and `quickOperation.title` is always empty, so hover text never appears.
- **No context menu.** The adapter's `SetContextMenu` hardcodes `moduleName` to `entry`, while this project's module is named `electron`.
- **Only the white glyph exists**, tuned for a dark status bar (this device reports `long-notround-horizontal-dark-tablet-xhdpi`). A light wallpaper needs a black line-art variant.
- **Huawei Account sign-in and cloud sync are upstream capabilities** — unverified on this device by this fork, and not promised to work.
- **Tested on 2in1 only**; tablet is unverified. Unsupported calls on this runtime generally return 801 / 16000067.
- **No cross-version guarantee.** The numbers and conditions behind changes 2 and 3 were tuned against the application package's behavior; another version may need them revisited. Change 10 depends on the diagram engine's CSS variable names (`--pele-fg` and friends), so a different engine means revisiting it too. The update channel itself moves complete official packages and is unaffected. (What the 1.14.5 → 1.15.0 step actually looked like: 369 / 368 files in the two asars, of which 344 are byte-identical, 15 changed, 9 added and 10 removed. The important removal is `lib/mermaid.min.js` (2,964,042 bytes) — the diagram engine became Pelé 1.8.0 (`lib/pele.min.js`, 699,670 bytes; that file was already present in 1.14.5 but **referenced by nothing**, and 1.15.0's `app.js` is the first to reference it, with the `--pele-*` variables appearing in `app.css` for the first time as well). The other 18 additions and removals are fonts and icons renamed from hashed file names to readable ones (`public/fonts/01dc…woff2` → `public/InterVariable.woff2` and the like). The 15 changed files include `app.css` (668,223 → 598,237 bytes) and `app.js` (3,942,126 → 3,372,270 bytes), so after a version bump the class names and call shapes that changes 2 and 3 depend on have to be re-checked — done for 1.15.0 here: the `body.mod-windows` / `mod-linux` styles and the `window.open("about:blank","_blank",…)` call shape are unchanged, so changes 2 and 3 still hold.)
- **`resources/app/package.json` still says `name: "obsidian"` / `author: "Obsidian"`.** That is Electron-internal metadata, not exposed in the HAP or the app list, but `app.getPath('userData')` derives from it — renaming would relocate the user's data directory, which costs far more than it buys, so the name is left alone; the `description` now describes this adaptation layer. Left as is on purpose, not an oversight.

---

## Acknowledgements

- [Obsidian](https://obsidian.md) — the adaptation target. This project is not affiliated with it.
- OHSidian and its authors — this fork's baseline.
- The contributors of the HarmonyOS Electron runtime — the layer that makes running an Electron app on OpenHarmony possible at all.
- [Electron](https://www.electronjs.org), [InversifyJS](https://inversify.io), [HarmonyOS](https://developer.huawei.com/consumer/en/harmonyos/).

---

<p align="center">
  <sub>OHVault is an independent community project with no affiliation, sponsorship or endorsement from the Obsidian rights holders or from Huawei.<br/>
  It provides a platform adaptation layer only, contains no Obsidian code or assets, and offers no means of circumventing license terms.</sub>
</p>
