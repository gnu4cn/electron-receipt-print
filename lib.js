'use strict';
const Store = require('electron-store');
const store = new Store();

// 导入 moment.js 以处理日期
const moment = require('moment');

var levelup = require('levelup');
var leveldown = require("leveldown");

// 从上一步的查询结果得到新的一个序列号的函数
function getSN(oldRecords){
    var date = moment().format('YYYYMMDD');

    var amount = (oldRecords.length + 1).toString();
    var digits = amount.length;

    // 补充‘0’, store.get('NUMBER_DIGITS') + 1 是因为 Array(n).join('0') 只能得到 n-1 个 `0`
    var num = `${digits<store.get('NUMBER_DIGITS') ? Array((store.get('NUMBER_DIGITS')+1)-digits).join('0') : ''}${amount}`;

    return `${date}${num}`;
}

// 实现了一个range函数
function range (start, end) {
    var ret = [];
    if (!end) {
        end = start;
        start = 0;
    }
    for (var i = start; i < end; i++) {
        ret.push(i);
    }
    return ret;
};

// 这个函数用来做什么啊？
function searchMatch (haystack, needle) {
    if (!needle) {
        return true;
    }
    return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
}

// 阿拉伯数字转汉字大写的函数
// https://gist.github.com/tonyc726/00c829a54a40cf80409f
function digitUppercase (n) {
    var fraction = ['角', '分'];
    var digit = [
        '零', '壹', '贰', '叁', '肆',
        '伍', '陆', '柒', '捌', '玖'
    ];
    var unit = [
        ['元', '万', '亿'],
        ['', '拾', '佰', '仟']
    ];
        var head = n < 0 ? '欠' : '';
        n = Math.abs(n);
        var s = '';
        for (var i = 0; i < fraction.length; i++) {
            s += (digit[Math.floor(n * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
        }
        s = s || '整';
        n = Math.floor(n);
        for (var i = 0; i < unit[0].length && n > 0; i++) {
            var p = '';
            for (var j = 0; j < unit[1].length && n > 0; j++) {
                p = digit[n % 10] + unit[1][j] + p;
                n = Math.floor(n / 10);
            }
            s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
        }
        return head + s.replace(/(零.)*零元/, '元')
            .replace(/(零.)+/g, '零')
            .replace(/^整$/, '零元整');
}

//
// 使用levelup做数据存储的后端
//
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
    range: range,
    searchMatch: searchMatch,
    digitUppercase: digitUppercase,
    getSN: getSN,
    db: db,
    put: put,
    get: get,
    del: del,
    find: find
} 
