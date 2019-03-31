'use strict';

// 导入渲染进程与主进程通信模块, 用于将当前结帐单保存到数据库、后台打印、删除某个结帐单
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;

// electron-store
const Store = require('electron-store');
const store = new Store();

// 导入 moment.js 以处理日期
const moment = require('moment');

const conf = require(`${store.get('DIR_ROOT')}/config`);
const lib = require(`${store.get('DIR_ROOT')}/lib`);

// 用于搜索的匹配函数
const searchMatch = lib.searchMatch;

var receiptPrintApp = angular.module("receiptPrintApp", ["ngSanitize", "720kb.datepicker", "ngMaterial"])
.controller("ReceiptPrintController", function($scope, $filter, $q){
    var s = $scope;
    //支付方式
    s.payments = conf.paymentTypes;

    var storedTitle = store.get('TITLE');
    s.uniteName = (storedTitle === '' ? store.get('TITLE_DEFAULT') : store.get('TITLE'));

    ipcRenderer.on('title-updated', (event, arg) => {
        s.uniteName = store.get('TITLE');
        s.$apply();
    });

    // 机构部门
    // 单独为 unites 建立一个对象，以便处理与其有关的数据
    //
    // 对于系统中没有的uniteObj与personObj, 为降低复杂度，决定在最终保存结帐单
    // 时，分别将其保存到数据库中。以简化处理过程
    //
    s.unites = {};

    s.unites.get = function (d) {
        ipcRenderer.send('fetch-all-req', {'type': 'unite'});

        ipcRenderer.on('fetch-all-reply-unite', (event, arg)=>{
            d.resolve(arg);
        });
    }

    s.unites.getMatched = function (q) {
        var d = $q.defer();

        this.get(d);

        return d.promise.then( (d) => {
            return $filter('filter')(d, function(u){
                if(searchMatch(u.name, q)){
                    return true;
                }
                return false;
            });
        });
    }

    s.unites.add =  function (name) {
        ipcRenderer.send('save-req', {'data': {"name": name}, 'type': 'unite'});

        ipcRenderer.on('save-reply-unite', (event, arg)=>{
            s.receipt.uniteObj = arg;
        });
    }


    // 人员部分
    s.person = {};

    s.person.get = function (d) {
        var isUniteObjNull = s.receipt.uniteObj === null;

        var parentSN = isUniteObjNull ? '' : `${s.receipt.uniteObj.SN}`;

        var paras = {
            'type': 'person', 
            'isChildType': true, 
            'parentSN': parentSN
        }

        ipcRenderer.send('fetch-all-req', paras);

        ipcRenderer.on('fetch-all-reply-person', (event, arg) => {
            d.resolve(arg);
        });
    }

    s.person.getMatched = function (q) {
        var d = $q.defer();

        this.get(d);

        return d.promise.then((data) => {
            return $filter('filter')(data, function(p){
                if(searchMatch(p.name, q)){
                    return true;
                }
                return false;
            });
        });
    }

    s.person.add = function (name) {
        // 这里要考虑两种情况：
        //  1、已有uniteObj；
        //  2、uniteObj 为 null。两种情况要分别应对。

        console.log(s.receipt.uniteObj);

        if (s.receipt.uniteObj === null) {
            s.receipt.personObj = {
                'name': name,
                'SN': '',
                'parentSN': '',
                'saved': false
            };
            // 这里的 s.receipt.personObj 尚未保存，待以后保存
        }
        else {
            var uniteSN = s.receipt.uniteObj.SN;
            var paras = {
                'data': {
                    "name": name,
                    "uniteSN": uniteSN
                }, 
                'type': 'person', 
                'isChildType': true, 
                'parentSN': uniteSN
            };

            ipcRenderer.send('save-req', paras);

            ipcRenderer.on(`save-reply-person`, (event, arg)=>{
                s.receipt.personObj = arg;
            });
        }
    }

    s.types = conf.types;

    s.tmp = {};
    s.tmp.updateTypeObj = function () {
        this.subTypeOneObj = undefined;
        this.subTypeTwoObj = undefined;
        this.subTypeThreeObj = undefined;
        this.amount = 0;
        this.startDate = undefined;
        this.endDate = undefined;
        this.price = undefined;
        this.amount = undefined;
        delete this.timeObj;
        delete this.siteObj;
    }

    s.tmp.init = function (){
        this.typeObj = undefined;
        this.subTypeOneObj = undefined;
        this.subTypeTwoObj = undefined;
        this.subTypeThreeObj = undefined;
        this.amount = 0;
        this.startDate = undefined;
        this.endDate = undefined;
        this.price = undefined;
        this.amount = undefined;
        delete this.timeObj;
        delete this.siteObj;
    }

    s.tmp.calculateFee = function () {
        const oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
        var firstDate = new Date(this.startDate);
        var secondDate = new Date(this.endDate);
        var diffDays = Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay))) + 1;

        // 这里计算每个消费项目的费用, 注意这里餐饮的费用是按人次计算，并没有乘以天数，人次需要人工
        // 计算,或者直接乘以天数
        this.fee = this.amount * diffDays * this.price;
    }

    s.tmp.add = function () {
        this.calculateFee();
        s.receipt.addItem(this);
        this.init();
    }

    s.receipt = {},
    // 用于承办单位、联系人与结帐方式变化时，更新receipt保存状态

    s.receipt.init = function (){
        // 初始化票据的项目数组
        this.saved= false,
        this.printed = false;
        this.items = [],
        // 这里从主进程获取序列号
        this.feeUppercase = '';
        this.fee = 0;
        this.uniteObj = undefined;
        this.personObj = undefined;
        this.paymentObj = undefined;
        s.tmp.init();

        ipcRenderer.send('get-SN-req', {'type': 'receipt', 'isChildType': false});

        ipcRenderer.on('get-SN-reply-receipt', (event, arg)=>{
            this.SN = arg;

            s.$apply();
        });
    }

    s.receipt.changed = function (whichStatus){
        if (whichStatus === 'items' || whichStatus === 'personObj' || whichStatus === 'paymentTypeObj') {
            this.saved = false;
            this.printed = false;
        }
        if (whichStatus === "printed") {
            this.saved = false;
            this.printed = !this.printed;
        } 
    }

    // receipt 增加条目
    s.receipt.addItem = function (item) {
        this.items.push(Object.assign({}, item));
        this.calculateFee();
    }

    //删除当前条目
    s.receipt.removeItem = function (index) {
        this.items.splice(index, 1);
        this.calculateFee();
    }

    s.receipt.calculateFee = function (){
        var fee = 0;
        this.items.forEach(function (item) {
            fee += item.fee;
        }); 
        this.fee = fee;

        this.feeUppercase = lib.digitUppercase(fee);

        // 触发重新计算，都将导致receipt的saved状态为未保存。
        this.changed('items');
    }

    // receipt 保存，调用 Electron 的ipcRenderer(注意这里的拼写), 往主进程发送当前receipt, 以持久化
    // 该receipt, 并接收返回的保存结果（保存成功与否、当前receipt的数据库索引等）
    s.receipt.save = function () {
        // 发起保存请求
        ipcRenderer.send('save-req', {'data': this, 'type': 'receipt'});

        // 等待回应
        ipcRenderer.on('save-reply-receipt', (event, arg) => {
            this.saved = true;
            // 每次保存后都要更新既往结帐单
            s.receipts.init();

            // 注意这一句，十分重要
            // https://stackoverflow.com/questions/30177711/dom-isnt-refreshing-after-modifying-angular-scope
            // s.$apply();
        }); 

    }

    // 装入既有数据
    s.receipt.load = function(r){
        // 这里之所以要使用一个s, 是因为在下面的forEach中，没有this
        var self = this;

        Object.keys(r).forEach(function(k){
            // console.log(this); 将输出 undefined 
            // 这样写了后，不会破坏 receipt原来的那些方法
            self[k] = r[k];
        }); 
    }

    // 打印该结帐单，往主进程发送一个包含该结帐单serialNumber的消息，之后等待主进程返回
    // 结果，期间将打印按钮置为disabled状态，并将按钮文字显示为“打印中...”
    s.receipt.print = function () {
        ipcRenderer.send('print-req', {'type': 'receipt', 'SN': this.SN});

        ipcRenderer.on('print-reply', (event, arg) => {
            this.changed('printed');

            // s.$apply(); 
        });
    }

    s.receipt.uniteObjChanged = function () {
        // 两种情况：1、某个保存的单位；2、null
        if ( this.items.length === 0 ){
            this.personObj = undefined;
        }
        this.changed('uniteObj');
    }

    // 既往结帐单部分
    s.receipts = {};

    s.receipts.init = function () {
        this.data = undefined;
        this.filteredItems = [];
        this.groupedItems = [];
        this.itemsPerPage = 5;
        this.pagedItems = [];
        this.currentPage = 0;
        this.query = '';


        ipcRenderer.send('fetch-all-req', {'type': 'receipt', 'isChildType': false});

        ipcRenderer.on('fetch-all-reply-receipt', (event, arg)=>{
            this.data = arg;

            // functions have been describe process the data for display
            this.search();
            s.$apply();
        });        
    }

    // init the filtered items
    s.receipts.search = function () {
        var self = this;

        this.filteredItems = $filter('filter')(this.data, function (item) {
            var f = [item.SN, item.fee.toString(), item.personObj.name, item.uniteObj.name];

            if (searchMatch(f[0], self.query) || searchMatch(f[1], self.query) || searchMatch(f[2], self.query) || searchMatch(f[3], self.query)){
                return true;
            }

            return false;
        });

        // 最新结帐单排最前
        this.filteredItems = $filter('orderBy')(this.filteredItems, 'SN', true);

        this.currentPage = 0;
        // now group by pages
        this.groupToPages();
    }

    // calculate page in place
    s.receipts.groupToPages = function () {
        this.pagedItems = [];

        for (var i = 0; i < this.filteredItems.length; i++) {
            if (i % this.itemsPerPage === 0) {
                this.pagedItems[Math.floor(i / this.itemsPerPage)] = [ this.filteredItems[i] ];
            } else {
                this.pagedItems[Math.floor(i / this.itemsPerPage)].push(this.filteredItems[i]);
            }
        }
    }

    s.range = lib.range;

    s.receipts.prevPage = function () {
        if (this.currentPage > 0) {
            this.currentPage--;
        }
    }

    s.receipts.nextPage = function () {
        if (this.currentPage < this.pagedItems.length - 1) {
            this.currentPage++;
        }
    }

    s.receipts.setPage = function (n) {
        this.currentPage = n;
    }
});

receiptPrintApp.config(["$compileProvider",function(e) {
    e.aHrefSanitizationWhitelist(/^s*(https?|ftp|mailto|javascript):/)
}]);
