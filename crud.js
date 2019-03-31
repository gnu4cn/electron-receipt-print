'use strict';
// 
// 参考：http://yijiebuyi.com/blog/1c7f6b3fe9aa6554a9a54ecd803e7d74.html
// 删除了 batch, 重写了 find
//
//
// nodeJS 下levelup 的安装，参考：
// https://github.com/Level/electron-demo/blob/master/index.html
//

// 数据总是以 type:YYYYMMDD:NNNN 作为 key, 以某种 type 的对象加以保存的
// 因此在存入前，及取出后，都要进行对象与字符串之间的转换，使用JSON.stringify
// 与 JSON.parse
const Store = require('electron-store');
const store = new Store();

var levelup = require('levelup');
var leveldown = require("leveldown");

var db = levelup('./db', {'db': leveldown}); 

function put(key, value, cb) {
    if (key && value) {
        db.put(key=key, value=JSON.stringify(value), {'sync': true}, (error) => {
            cb(error);
        })
    } else {
        cb('no key or value');
    }
}

function get(key, cb) {
    if (key) {
        db.get(key, (error, value) => {
            cb(error, JSON.parse(value));
        })
    } else {
        cb('no key', key);
    }
}

function del(key, cb) {
    if (key) {
        db.del(key, (error) => {
            cb(error);
        })
    } else {
        cb('no key');
    }
}

// 这里重写了 find 方法
// 依据leveldb的键（key）格式： type:YYYYMMDDNNNN，某类型数据每天最多可保存9999条
// type 参数，在levelDb中搜索指定的‘表’
// find 参数，指定‘表’搜索条件, 提供空字串，就返回所有该“表”的记录，提供某个“YYYYMMDDNNNN”
// 值，返回当天的记录
function find({date='', type, isChildType, parentSN}, cb) {
    var numLower = Array(store.get('NUMBER_DIGITS') + 1).join('0');
    var numHigher = Array(store.get('NUMBER_DIGITS') + 1).join('9');

    var SNLower = `${date.length === 0 ? store.get('RELEASE_DATE') : date}${numLower}`;
    var SNHigher = `${(date.length === 0) ? '20491231': date}${numHigher}`;

    if ( isChildType ){
        var hasParent = parentSN.length !== 0;

        var parentSNLower = hasParent ? `${parentSN}` : `${store.get('RELEASE_DATE')}${numLower}`;
        var parentSNHigher = hasParent ? `${parentSN}` : `20491231${numHigher}`;

        var lower = `${type}:${parentSNLower}:${SNLower}`;
        var higher = `${type}:${parentSNHigher}:${SNHigher}`;
    }
    else {
        var lower = `${type}:${SNLower}`;
        var higher = `${type}:${SNHigher}`;
    }

    var options = {gt: lower, lte: higher, reverse: false, keys: true, values: true, limit: -1};

    var r = [];

    db.createReadStream(options)
        .on('data', function (data) {
            r.push(JSON.parse(data.value));
        })
    .on('error', function (err) {
        //
    })
    .on('close', function () {
        //
    })
    .on('end', function () {
        // 现在返回的是纯数据对象数组
        return cb(r);
    })
}

module.exports = {
    db: db,
    put: put,
    get: get,
    del: del,
    find: find
}
