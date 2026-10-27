<p align="center">
  <img src="AppScope/resources/base/media/startIcon.png" alt="OHVault Logo" width="120" />
</p>

<h1 align="center">OHVault</h1>

<p align="center">
  <strong>Obsidian 在 HarmonyOS PC 上的非官方适配层</strong>
</p>

<p align="center">
  一个社区 fork：把官方 Obsidian 应用包跑在鸿蒙原生运行时上。本项目只包含适配层代码与自绘图标，<br/>
  <strong>不含、也不分发 Obsidian 本体的任何代码或资源</strong>。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HarmonyOS-6.1.0%2823%29-blue" alt="HarmonyOS 6.1.0(23)" />
  <img src="https://img.shields.io/badge/ArkTS-API%2023-orange" alt="ArkTS API 23" />
  <img src="https://img.shields.io/badge/adapted%20for-Obsidian%201.14.5-purple" alt="Adapted for Obsidian 1.14.5" />
  <img src="https://img.shields.io/badge/fork%20of-OHSidian-lightgrey" alt="Fork of OHSidian" />
  <img src="https://img.shields.io/badge/unofficial%20project-not%20affiliated-red" alt="Unofficial, not affiliated" />
</p>

> OHVault 不是 Obsidian 官方的鸿蒙版本，与 Obsidian 权利方、华为公司均无隶属、赞助或背书关系。


---

## 目录

- [这个项目是什么，不是什么](#这个项目是什么不是什么)
- [关于改名与图标](#关于改名与图标)
- [版本谱系](#版本谱系)
- [本仓库改动的内容](#本仓库改动的内容)
- [构建与运行](#构建与运行)
- [Obsidian 应用包的完整性](#obsidian-应用包的完整性)
- [许可与归属](#许可与归属)
- [已知限制](#已知限制)
- [致谢](#致谢)

---

## 这个项目是什么，不是什么

| 是 | 不是 |
|----|------|
| HarmonyOS PC（2in1）/ 平板上的**运行适配层**仓库 | Obsidian 的一部分，也不是官方或授权版本 |
| 上游 OHSidian 的**社区 fork**，跟进 1.14.5 这版应用包 | Obsidian 的重新实现或替代实现 |
| 针对鸿蒙 PC 的窗口、状态栏、删除语义做的**修复** | 破解、激活工具，或任何绕过许可校验/付费门槛的手段 |
| 让官方应用包"能在这台机器上启动并正常用"的胶水代码 | 反编译产物、修改版应用包、盗版分发渠道 |
| 本仓库自己维护的**原创图标美术** | 取自 Obsidian 或任何第三方的美术资产 |

用一句话概括本项目的技术定位：**Obsidian 官方发行的应用包原封不动地载入本仓库提供的 Electron 兼容运行时**，Obsidian 自身不需要知道底下是鸿蒙。本项目对运行时的所有增量都写在自己维护的引导脚本里，不写进应用包。

关于使用许可：Obsidian 本体的许可条款由**你与官方之间**成立。本项目不授予、也无法授予你任何关于 Obsidian 的权利；是否可商用、是否需要同步或付费功能，请以官方条款为准。本项目仅涉及"在鸿蒙上运行"这一层平台适配。

---

## 关于改名与图标

本项目的产品名（OHVault）、包名（`com.niangao.ohvault`）和全部图标都是自定的，不是从上游或官方沿用的。目的很明确：

1. **不做来源混淆**。装机列表、状态栏、窗口标题里出现的名字是 OHVault，不会让人误以为装了 Obsidian 官方鸿蒙版；要真跑的是 Obsidian，也会在说明里以"适配目标"的方式提及，而不是当作产品名。
2. **不搭他人资产的便车**。启动图标、状态栏图标、多语言标签全部替换为自绘标记。项目名 OHVault = OH（OpenHarmony / 鸿蒙）+ Vault（"知识库目录"这个通用概念），不指向任何既有商标。

商标提及方式：Obsidian、HarmonyOS、Huawei 等名称与标识均为其各自权利人所有，本仓库**仅在指示性（nominative）意义上使用**——用来说明适配目标与运行平台，不构成商标法意义上的使用，也不表示来源。

---

## 版本谱系

自上而下是本项目依赖的三层，本 fork 只占最下面那一格：

```
鸿蒙 Electron 运行框架   ← OpenHarmony 的 Electron 移植，提供 ArkTS 适配层与 libadapter.so
        ↓
OHSidian                ← 社区移植工程，把 Electron 应用包接到上述运行时（本仓库的分叉基线）
        ↓
OHVault（本仓库）        ← 跟进 Obsidian 1.14.5 应用包 + 鸿蒙 PC 端的修复与自绘标识
```

**本 README 不复述运行框架与上游移植工程的实现原理。** 引擎侧（约 50 个适配器、JSBind 注册、C++ 原生库、依赖注入结构、云同步实现等）的说明请读上游文档，它们不属于本仓库的原创内容，也不在本项目的维护与承诺范围内。下面只列本仓库相对分叉基线**实际改了哪些文件、为什么改**。

---

## 本仓库改动的内容

所有改动位于两个位置：本仓库自己维护的启动引导脚本 `web_engine/src/main/resources/resfile/resources/app/main.js`，以及鸿蒙侧的资源与构建配置。没有一行写进 Obsidian 的应用包。

| # | 改动 | 位置 | 为什么这么改 |
|---|------|------|-------------|
| 1 | 跟进应用包 1.14.5 | [resources/app/package.json](web_engine/src/main/resources/resfile/resources/app/package.json) | 版本对齐；应用包本身由使用者自备（见下） |
| 2 | 标题栏按钮区留白 132 px | [main.js:125](web_engine/src/main/resources/resfile/resources/app/main.js#L125) | 鸿蒙 PC 会在**无边框窗口**右上角自绘最大化/最小化/关闭按钮。Obsidian 只在 `body.mod-windows` / `mod-linux` 下预留这块空间，而本运行时 `process.platform` 报 `openharmony`，两个类名都不会加上，于是 `--frame-right-space` 是空的，标签条会滑到按钮底下。改为运行时注入 132 px（实测：3 个按钮 × 42 px 间距 + 12 px 右内缩 − Obsidian 自身叠加的 8 px） |
| 3 | 弹出窗口回落为窗口内模态 | [main.js:146](web_engine/src/main/resources/resfile/resources/app/main.js#L146), [main.js:198](web_engine/src/main/resources/resfile/resources/app/main.js#L198) | 设置面板通过 `window.open("about:blank", "_blank", "popup,…")` 打开，而本平台创建不出这种窗口（`startAbility` 返回 16000067），模态会落进一个永不显示的表面，连带 `workspace.activeWindow` 指错、侧栏开关失灵。在主进程对 popup 请求返回 `{action:'deny'}`，让 `window.open` 返回 `null`——这正是 Obsidian 自己判断"该退回窗口内模态"的条件。**必须在主进程做**：从渲染脚本覆盖 `window.open` 会在 vault 引导流程里被重新赋值覆盖掉，补丁撑不到用户点齿轮 |
| 4 | 状态栏常驻图标 | [main.js:225](web_engine/src/main/resources/resfile/resources/app/main.js#L225), [app/tray-icon.png](web_engine/src/main/resources/resfile/resources/app/tray-icon.png) | Obsidian 自身从不创建 Tray，窗口一隐藏就没有任何"应用还活着"的迹象。用 `electron.Tray` 走本运行时已有的链路落到状态栏。图标为 24×24 纯白描线 + 透明 alpha（本机深色栏），取启动图标同一标记在小尺寸下能站住的部分（六边形 + 三颗点，顶角相扣的双环在 24px 会糊成一团，故省略）；Tray 实例必须由模块级变量常驻引用，否则被回收、图标凭空消失 |
| 5 | 删除文件回落进 vault 的 `.trash` | [main.js:262](web_engine/src/main/resources/resfile/resources/app/main.js#L262)–[main.js:351](web_engine/src/main/resources/resfile/resources/app/main.js#L351) | 这台设备的原生 `shell.trashItem` 会**返回成功但文件仍在**（FUSE / xattr 限制）。Obsidian 按返回值认为已删除，用户看到的却是文件还在。改为：只有确认目标消失才算成功，否则移动到所属 vault 的 `.trash`；vault 归属先按 `obsidian.json` 的 vault 表做最长前缀匹配，失败再沿 `.obsidian` 目录向上查找 |
| 6 | 关掉桌面端的更新假设 | [main.js:76](web_engine/src/main/resources/resfile/resources/app/main.js#L76) | 本端口不能下载并重启二进制，写 `updateDisabled=true` 免得应用一直卡在"检查更新"。同一函数会撤销早先强制 `frame=native` 的配置——那条改动会把 vault 路径显示在系统标题栏里，与"不暴露仓库路径"的诉求相反 |
| 7 | 构建与凭据卫生 | `.gitignore`、`build-profile.example.json5`、`electron/src/main/module.json5.example`（`build-profile.json5` 与 `module.json5` 都不入库） | 目标 SDK 提到 6.1.0(23)；`build-profile.json5`（含签名口令）、`module.json5`（含 AGC `client_id`）、`*.p12/p7b/cer/keystore/jks`、`agconnect-services.json` 一律排除，仓库里只留不含凭据的 example。Electron 运行时二进制与应用包同样不入库（见构建步骤第 2、4 步），入库的只有适配层源码、配置模板与自绘图标 |
| 8 | 删除兜底的自检开关 | [main.js:353](web_engine/src/main/resources/resfile/resources/app/main.js#L353), [main.js:390](web_engine/src/main/resources/resfile/resources/app/main.js#L390) | 兜底逻辑涉及文件移动，所以配一个**默认关闭**的自测：仅在应用目录放置 `harmonyos-trash-test.enabled` 标记文件时才运行，用临时目录里的假 vault 试删一个临时文件，结束后恢复 `obsidian.json` 并删除临时目录，不触碰用户数据 |

两处值得留意的实现取向（不是 feature，是"为什么没做更复杂的那版"）：

- 第 2、3 项都走**运行时注入**，不去改应用包里的样式或代码——这样应用包保持与官方发行版逐字节一致，升级版本时不用重打补丁。
- 第 3 项**没有做平台门控**（不是"只在某些平台生效"）。曾试过按平台开关，实际维护成本更高、问题更难复现，现在无条件生效。

---

## 构建与运行

### 环境

| 工具 | 版本 |
|------|------|
| DevEco Studio | **6.1.5 Preview**（构建 6.1.5.408，基于 BitFun Platform 0.38.1-B661；随附 hvigor `6.23.18-next`、toolchains `6.1.0.105`） |
| HarmonyOS SDK | **6.1.0(23) / API 23**（`compileSdkVersion` 与 `compatibleSdkVersion` 都是它） |
| Hvigor | `6.23.18-next`（随 IDE 分发，无需单独安装；工程 `hvigor-config.json5` 里的 `modelVersion: 5.0.0` 是构建模型版本，**不是 IDE 版本**，别拿它当环境要求） |
| 目标设备 | 2in1、tablet（实测机型为 2in1，density 2.0 / 深色模式） |

本机构建用的是 **Preview 版 IDE**，上面这组版本只是"这套产物是怎么来的"的记录，不是对本仓库构建环境的承诺：换成正式发布的 DevEco Studio 或别的 SDK 小版本，本项目没有验证过，出现差异不等同于本仓库有 bug。

### 步骤

```bash
# 1. 准备签名配置（不要提交含凭据的文件，.gitignore 已排除 build-profile.json5）
cp build-profile.example.json5 build-profile.json5
#    然后填入你自己的证书、profile 与 keystore 路径

# 2. 取回 Electron 运行时二进制（本仓库不分发：libelectron.so 单个 160 MB，超 GitHub 单文件上限）
#    来源就是本项目分叉基线的那个仓库，按原路径放回本工程即可。运行时内容存在 LFS 上，
#    直链形如：https://media.githubusercontent.com/media/HanversionOvO/OHSidian/main/<仓库内路径>
#    需要的文件：
#      electron/libs/arm64-v8a/   libelectron.so  libadapter.so  libffmpeg.so  libextractor.so  libc++_shared.so
#      web_engine/src/main/resources/resfile/
#                                 icudtl.dat  resources.pak  chrome_100_percent.pak  chrome_200_percent.pak
#                                 snapshot_blob.bin  v8_context_snapshot.bin  style_font_config.json  electron
#                                 locales/en-US.pak  locales/zh-CN.pak
#                                 vulkan/icd.d/vk_swiftshader_icd.json

# 3. 准备模块配置（含你自己的 AGC client_id，module.json5 同样不入库）
cp electron/src/main/module.json5.example electron/src/main/module.json5
#    然后把 client_id 换成你在 AppGallery Connect 里拿到的值

# 4. 放入你自己获取的 Obsidian 应用包
#    目标路径：web_engine/src/main/resources/resfile/resources/app/obsidian.asar
#    （本仓库不分发这个文件，见下节）

# 5. 构建
hvigorw assembleHap
#    产物：electron/build/outputs/default/electron-default-signed.hap
```

也可以在 DevEco Studio 里打开项目后走 **Build > Build HAP(s)**。

华为侧能力（Account Kit、Cloud Foundation 等）需要你在 AppGallery Connect 建应用，把 `agconnect-services.json` 放到 `electron/src/main/resources/rawfile/`，并把 `module.json5` 的 `client_id` 填成对应应用的值；`agconnect-services.json` 含密钥，与 `module.json5` 一样已被 `.gitignore` 排除。纯本地使用不接华为能力时，`client_id` 留占位符也能构建。

### 关于更新包

引导脚本支持"外置换包"：把 `obsidian-<version>.asar` 放进应用的 userData 目录（和设备上 `obsidian.log` 同级），启动器每小时轮询一次，只在版本号更高时替换内置包（逻辑起于 [main.js:771](web_engine/src/main/resources/resfile/resources/app/main.js#L771)）。这个通道**只搬运官方发布的完整包**，不做任何拆分或改写。

---

## Obsidian 应用包的完整性

这一节是本仓库希望任何人都能自行验证的核心承诺：**我们不改 Obsidian 的应用包。**

- 本仓库**不分发** Obsidian 的应用代码、asar 包或其内部资源。上面第 4 步要求你自己从 obsidian.md 获取；`*.asar` 与 `*.asar.gz` 都已被 `.gitignore` 挡住，构建产物 `*.hap` 也一样。
- Electron / Chromium 运行时同样不在本仓库里：`electron/libs/` 与 `resfile` 下的运行时文件按第 2 步自取。来源是本项目分叉基线的那个仓库，本仓库不重新分发它，也不对其可用性作承诺。
- 你放进来的 asar 不会被本项目的构建流程修改：适配层全部代码都在 `main.js` 与 ArkTS 侧，运行时通过 Electron 公开 API 生效。
- 本机内置包的哈希，供你自己下载后比对：当前 1.14.5——`sha256 3a349274f789b62c5b35ad19de10311909a94e8783033569c2210a4bac491780`，28177896 字节；上一版 1.14.4——`sha256 146ef8470d8cbb4a6db209bdc19bf2bad13350444186c0fd93c31087b142b92f`，27477966 字节，这一版**已按官方发行包逐字节核对过**。
  任何人都可以对自己下载的官方包算同样的哈希来核对官方发行完整性；哈希一致即说明本项目没有篡改应用内容。1.14.5 这一版尚未做这个核对（本机只有使用者放入的包），在它被核对前，请把它当作"待验证"而不是"已确认与官方一致"。
- 本项目不包含、也拒绝任何形式的许可校验绕过、激活码、试用重置。Obsidian 在本地管理自己的 Markdown 文件这一基本用途不需要本项目之外的任何条件。

---

## 许可与归属

- **本仓库代码**分叉自 OHSidian，其上游声明为 BSD 3-Clause License，版权声明依许可条款要求保留：
  `Copyright (c) 2023-2025, Haitai FangYuan Co., Ltd.`。本 fork 新增的改动在与上游条款不冲突的前提下按同样条件分发。
- **Obsidian** 不授予本项目任何权利，本项目也不向你授予任何关于 Obsidian 的权利。Obsidian 及其图标为各自权利人所有。
- **Electron** 与 `@electron/remote`、**InversifyJS**、`reflect-metadata` 遵循 MIT License。
- **鸿蒙 Electron 运行时二进制**（`libelectron.so`、`libadapter.so`、Chromium 资源等）不随本仓库分发，需要使用者按构建步骤自行取用；本项目不重新打包、不镜像、也不改动它们。
- **HarmonyOS SDK / DevEco / AGC 组件**遵循华为开发者协议。
- **图标美术**（启动图标与状态栏图标）为本项目自绘。上游项目原先使用的 Obsidian 图标仅保留在维护者本机备份中，不随本仓库任何分支或发行物分发。

---

## 已知限制

写在这里是为了别把它当成"应该已经能用"的功能：

- **状态栏左键业务没接**。本机从未观测到 `statusBarIconClick` 回调（同机型上另一个基于同一运行时的项目同样复现）。要做左键面板得走 ArkTS 的 `StatusBarViewExtensionAbility` 路线，壳子已经具备：[StatusBarEntryAbility.ets](electron/src/main/ets/entryability/StatusBarEntryAbility.ets) 与空的 [StatusBarPage.ets](electron/src/main/ets/pages/StatusBarPage.ets)。
- **没有 tooltip**。适配层的 `SetToolTips` 只把字符串存进字段，`quickOperation.title` 恒为空串，悬停提示不会显示。
- **没接右键菜单**。适配层 `SetContextMenu` 把 `moduleName` 硬编码为 `entry`，而本项目的模块名是 `electron`，直接调用会指错模块。
- **图标只出了白色一版**，适配深色状态栏（本机 `long-notround-horizontal-dark-tablet-xhdpi`）。浅色壁纸下需要另出一套黑色描线。
- **华为账号登录与云同步属上游能力**，本 fork 未在本机验证过，不承诺可用。
- **只在 2in1 实测**，tablet 机型未验证；本运行时不支持的调用一般返回 801 / 16000067。
- **不保证跨版本适用**。第 2、3 项的数值与判断是照 Obsidian 应用包的行为调出来的，换版本可能需要同步调整；引导层的更新通道本身按官方包设计，不受影响。（本次从 1.14.4 升到 1.14.5 的实测：两版 asar 里 366 个文件逐字节相同，`app.js` 3,942,126 字节中只有 1 个字节不同——版本字符串本身，`/package.json` 同理，另外多出一个尚未被任何文件引用的 `lib/pele.min.js`（Pele 1.8.0，Obsidian 自己的 MIT 图表渲染库）。所以这几处补丁依赖的类名、CSS 变量与 `window.open` 调用形式都没有变动。）
- **`resources/app/package.json` 里仍写着 `name: "obsidian"` / `author: "Obsidian"`**。那是 Electron 的内部元数据，不暴露在 HAP 或装机列表里，但 `app.getPath('userData')` 由它派生——改名会搬走用户数据目录，代价远大于收益，所以留着没动。这一点是有意取舍，不是遗漏。


---

## 致谢

- [Obsidian](https://obsidian.md) —— 本项目的适配目标。本项目与其无官方关联。
- OHSidian 及其作者 —— 本 fork 的分叉基线。
- 鸿蒙 Electron 运行框架的贡献者 —— 让 Electron 应用能在 OpenHarmony 上跑起来的那一层。
- [Electron](https://www.electronjs.org)、[InversifyJS](https://inversify.io)、[HarmonyOS](https://developer.huawei.com/consumer/cn/harmonyos/)。

---

<p align="center">
  <sub>OHVault 是独立的社区项目，与 Obsidian 官方及华为公司均无隶属、赞助或背书关系。<br/>
  本项目只提供平台适配层，不包含 Obsidian 应用的任何代码或资源，也不提供绕过许可条款的手段。</sub>
</p>
