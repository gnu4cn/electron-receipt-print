"use strict";

const setupEvents = require('./installers/setupEvents');

// 导入 moment.js 以处理日期
const moment = require('moment');

// 使用 electron-store 来存储程序参数
const Store = require('electron-store');
const store = new Store();

// process 用于判断是否是 MacOS 系统
const process = require('process');

// crud 用于操作 LevelDB
const crud = require('./crud');

// conf 存储程序参数
const conf = require('./config')

const lib = require('./lib');

// electron 相关
const electron = require('electron');
// 主进程与渲染进程通信使用 ipcMain
const ipcMain = electron.ipcMain;
// 用于控制应用生命周期的模块
const app = electron.app;
//
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;

const menuTemplate = [
{
    label: '文件(File)',
    submenu: [{
        label: '退出(Ctrl+Q)',
        accelerator: 'CmdOrCtrl+Q',
        role : 'quit'
    }]
},  
{
    label: '编辑(Edit)',
    submenu: [{
        label: '设置结算单抬头',
        accelerator: 'CmdOrCtrl+T',
        click() {
            createPopupWindow({
                height: 160,
                width: 480, 
                title: "设置结算单抬头", 
                view: 'title'
            });
        }
    }]
},
{
    label: '帮助(Help)',
    submenu: [{
        label: '关于(About)',
        accelerator: 'CmdOrCtrl+A',
        click() {
            createPopupWindow({
                height: 480,
                width: 400, 
                title: "关于", 
                view: 'about'
            });
        }
    }]
}];


//handle setupevents as quickly as possible
if (setupEvents.handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let popupWindow;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
//
// 注意这里的写法
function createWindow(page, width, height) {
    var bgColor = ('Wheit' == store.get('theme')) ? '#ffffff' : '#1e1e1e';

    // Create the browser window.
    mainWindow = new BrowserWindow({
        'width': width,
        'height': height,
        'backgroundColor': bgColor,
        'icon': 'img/logo.png'
    });

    mainWindow.setMenu(Menu.buildFromTemplate(menuTemplate));

    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/ui/${page}`);

    // Open the DevTools.
    if (store.get('DEBUG')) {
        mainWindow.webContents.openDevTools()
    }

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.

        mainWindow = null;
        crud.db.close();

        // 下面的代码，令到程序真正退出
        BrowserWindow.getAllWindows().forEach((w)=>{
            w.close();
        });
    });
}

function createPopupWindow({height, width, view, title}) {
    var url = `file://${__dirname}/ui/${view}.html`;

    if(popupWindow) {
        var currentUrl = popupWindow.webContents.getURL();
        if ( url === currentUrl ) {
            popupWindow.focus();
            return;
        }
        else {
            popupWindow = null;
        }
    }

    popupWindow = new BrowserWindow({
        //height: 460,
        //width: 360,
        height: height,
        width: width,
        title: title,
        resizable: false,
        minizable: false,
        fullscreenable: false
    });

    popupWindow.setMenu(null);

    popupWindow.loadURL(url);

    popupWindow.on('closed', function(){
        popupWindow = null;
    })
}

app.on('ready', () => {
    createWindow('app.html', store.get('WIDTH'), store.get('HEIGHT'));
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
        crud.db.close();
    }
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow('app.html', store.get('WIDTH'), store.get('HEIGHT'));
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.




// 接收来自渲染进程的receipt对象，并加以保存后发送保存结果
ipcMain.on('save-req', (event, arg) => {
    // 以收到渲染进程发送过来的数据, 将其保存到数据库
    // 后期将支持渲染进程中“既有结帐单”的更新
    //
    var type = arg.type;
    var isChildType = arg.isChildType === null ? false : arg.isChildType;
    var parentSN = arg.parentSN === null ? '' : arg.parentSN;

    var paras = {
        'date': moment().format('YYYYMMDD'),
        'type': type,
        'isChildType': isChildType,
        'parentSN': parentSN
    }

    crud.find(paras, (res) => {
        var data = arg.data;

        if ( data.SN === undefined ){ 
            var SN = lib.getSN(res);
            data.SN = SN;
        } 
        else {
            var SN = data.SN
        };

        var key = isChildType ? `${type}:${parentSN}:${SN}` : `${type}:${SN}`;

        crud.put(key, data, (err) => {
            if (err) return console.log(err);

            data.saved = true;
            event.sender.send(`save-reply-${type}`, data);
        });
    });
});

// 处理渲染进程发出的新的表单序列号的请求
ipcMain.on('get-SN-req', (event, arg) => {
    var type = arg.type;
    var isChildType = arg.isChildType === null ? false : arg.isChildType;
    var parentSN = arg.parentSN === null ? '' : arg.parentSN;

    var paras = {
        'date': moment().format('YYYYMMDD'),
        'type': type,
        'isChildType': isChildType,
        'parentSN': parentSN
    }

    crud.find(paras, (res) => {
        event.sender.send(`get-SN-reply-${arg.type}`, lib.getSN(res));
    });
});

// 处理渲染进程发出的请求所有请求
ipcMain.on('fetch-all-req', (event, arg) => {
    var type = arg.type;
    var isChildType = arg.isChildType === null ? false : arg.isChildType;
    var parentSN = arg.parentSN === null ? '' : arg.parentSN;

    var paras = {
        'date': '',
        'type': type,
        'isChildType': isChildType,
        'parentSN': parentSN
    }

    crud.find(paras, (res) => {
        event.sender.send(`fetch-all-reply-${type}`, res);
    });
});

// 处理渲染进程发出的打印请求
ipcMain.on('print-req', (event, arg) => {
    // 利用arg, 构造一个查询的key
    var key = `${arg.type}:${arg.SN}`;

    crud.get(key, (err, res)=>{
        if (err) return console.log(err);

        // 这里已经获取到要打印结帐单的数据，可（1）直接打印，或（2）新开一个窗口打印
        // 使用 Electron 全局变量将该结帐单发送给打印页面
        global.receipt = res;

        //
        // https://stackoverflow.com/questions/46012272/silent-printing-in-electron
        //
        var p =  new BrowserWindow({
            width: 800,
            height: 600,
            show: true
        });

        p.once('ready-to-show', ()=>{
            //p.hide();
        });

        p.loadURL(`file://${__dirname}/ui/print.html`);
        var contents = p.webContents;

        contents.on('did-finish-load', ()=>{
            contents.print({}, ()=>{

            });
            event.sender.send('print-reply', null);
        });
    });
});

ipcMain.on('title-updated-req', (event, arg) => {
    //注意这里是主进程主动向渲染进程发送消息的方法。
    mainWindow.webContents.send('title-updated', arg);
});
