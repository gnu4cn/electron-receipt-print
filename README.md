# electronjs-receipt-print

本项目的目的是利用Electron构建一个打印票据的应用，目的是得到一个应用，并在应用构建过程中逐步掌握Electron。

## 环境的搭建

- Electron依赖NodeJS，故系统应首先安装NodeJS
- Electron可全局安装(`sudo npm install electron -g`)，也可本地安装（`npm install electron --save`）

## 文件结构

```
├── config.js
├── copying
├── db
│   ├── 000007.log
│   ├── CURRENT
│   ├── LOCK
│   ├── LOG
│   ├── LOG.old
│   └── MANIFEST-000006
├── git-push.sh
├── installers
│   ├── setupEvents.js
│   └── windows
│       ├── createinstaller-ia32.js
│       └── createinstaller-x64.js
├── lib.js
├── main.js
├── package.json
├── package-lock.json
├── README.md
├── Release.key
├── tree.sh
└── ui
    ├── about.html
    ├── app.html
    ├── css
    │   ├── app.css
    │   ├── app_dark.css
    │   └── print.css
    ├── img
    │   ├── Alipay.jpg
    │   ├── Boostrap_logo.svg
    │   ├── Electron.svg
    │   ├── icon.ico
    │   ├── leveldb-logo.svg
    │   ├── ngMaterial-logo.svg
    │   ├── nodejs-logo.svg
    │   └── WeChat-Pay.jpg
    ├── js
    │   ├── about.js
    │   ├── app.js
    │   ├── print.js
    │   └── title.js
    ├── print.html
    └── title.html
```

## Windows 系统 Electron 环境的搭建

- 安装nodejs for windows
- 安装 git for Windows, 得到 git-bash
- 安装 Python for Windows
- 安装 .Net Framework 2.0 SDK
- 安装 Visual Studio (C++ 部分)
- `npm install -g windows-build-tools` (作为管理员)

## `leveldown` - Google 出品的高速键值对存储方案

- Electron App 中要使用 LevelUp, 就要对 leveldown 进行`node-gyp rebuild`, 在`package.json`中有对应的 `postinstall` 脚本，其中无需`HOME=~/.electron-gyp` 项，亲测成功

## Windows 下 Electron App 应用打包
- 使用 `electron-packager`，在`package.json`中有对应的`package`脚本
- 使用 `electron-builder`, 尚未测试
