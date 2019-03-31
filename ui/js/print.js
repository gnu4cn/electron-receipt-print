'use strict';
const electron = require('electron');
const remote = electron.remote;
const Store = require('electron-store');
const store = new Store();

var receiptPrintApp = angular.module("receiptPrintApp", ["ngSanitize"])
.controller("receiptPrintController", function($scope){

    var s = $scope;

    s.title = store.get('TITLE');

    s.receipt = {},

    // 装入数据
    s.receipt.load = function(){
        // 这里使用的 Electron remote 模块，得到需打印表单数据
        var self = this;
        var r = remote.getGlobal('receipt');

        Object.keys(r).forEach((k)=>{
            self[k] = r[k];
        });
    }
});

receiptPrintApp.config(["$compileProvider",function(e) {
    e.aHrefSanitizationWhitelist(/^s*(https?|ftp|mailto|javascript):/)
}]);
