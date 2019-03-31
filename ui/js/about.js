'use strict';
const Store = require('electron-store');
const store = new Store();

var receiptPrintApp = angular.module("receiptPrintApp", ["ngSanitize", "ngMaterial"])
.controller("receiptPrintController", function($scope){

    var s = $scope;

    s.title = store.get('TITLE');

}).config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .dark();
}).config(["$compileProvider",function(e) {
    e.aHrefSanitizationWhitelist(/^s*(https?|ftp|mailto|javascript):/)
}]);

