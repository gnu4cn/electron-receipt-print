const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller,
      path = require('path');

    getInstallerConfig()
.then(createWindowsInstaller)
    .catch((error) => {
        console.error(error.message || error)
            process.exit(1)
    })

function getInstallerConfig () {
    console.log('creating windows x64 installer')
        const rootPath = path.join('./')
        const outPath = path.join(rootPath, 'dist')

        return Promise.resolve({
            appDirectory: path.join(outPath, 'ElectronReceiptPrint-win32-x64/'),
            authors: 'Peng Hailin, xfoss.com',
            noMsi: true,
		description: '一个基于ELectron, Angular, Boostrap, LevelDB 的票据打印软件',
            outputDirectory: path.join(outPath, 'windows-installer'),
            exe: 'ElectronReceiptPrint.exe',
            setupExe: 'ElectronReceiptPrintInstaller-x64.exe',
            setupIcon: path.join(rootPath, 'img', 'icon.ico')
        })
}
