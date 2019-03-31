'use strict';
const Store = require('electron-store');
const store = new Store();

// 导入渲染进程与主进程通信模块, 用于将当前结帐单保存到数据库、后台打印、删除某个结帐单
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;

var receiptPrintApp = angular.module("receiptPrintApp", ["ngSanitize", "ngMaterial"])
.controller("receiptPrintController", function($scope){

    var s = $scope;

    s.receiptTitle = store.get('TITLE');

    store.onDidChange('TITLE', (n, o) => {
        s.response = `“${n}” 已保存。`;    
        ipcRenderer.send('title-updated-req', {'title': n});
    });

    s.setTitle = function (title) {
        store.set('TITLE', title);
    }

}).config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .dark();
}).config(["$compileProvider",function(e) {
    e.aHrefSanitizationWhitelist(/^s*(https?|ftp|mailto|javascript):/)
}]);

