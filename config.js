'use strict';
// 使用 electron-store 来存储程序参数
//
// electron-store 保存的配置文件
// console.log(app.getPath('userData'));

const Store = require('electron-store');
const store = new Store();

store.set('DIR_ROOT', __dirname);
store.set('HEIGHT', 720);
store.set('WIDTH', 1024);
store.set('DEBUG', false);
store.set('NUMBER_DIGITS', 4);
store.set('RELEASE_DATE', '20170101');
store.set('TITLE_DEFAULT', '外训大队餐饮、住宿结帐单');

//服务类型
const types = [{
    id: 0,
    name: "餐 饮",
    rate: "元/人/天",
    unite: '人',
    subTypesOne: [{
        id: 0,
        name: "工作餐"
    },{
        id: 1,
        name: "宴 请"
    }],
        subTypesTwo: [{
                id: 0,
                name: "并蒂莲厅"
            },{
                id: 1,
                name: "牡丹厅"
            },{
                id: 2,
                name: "琼花厅"
            }]
},{
    id: 1,
    name: "住 宿",
    rate: "元/天/间",
    unite: '间',
    subTypesOne: [{
        id: 0,
        name: "单 间",
    },{
        id: 1,
        name: "标 间",
    },{
        id: 2,
        name: "套 间",
    }]
}];

//结算方式
const paymentTypes = [{
    id: 0,
    name: "现 金"
}, {
    id: 1,
    name: "公务卡"
}, {
    id: 2, 
    name: "内部转账"
}];

module.exports = {
    types: types,
    paymentTypes: paymentTypes
};
