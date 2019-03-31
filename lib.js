'use strict';
const Store = require('electron-store');
const store = new Store();

// 导入 moment.js 以处理日期
const moment = require('moment');

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

module.exports = {
    range: range,
    searchMatch: searchMatch,
    digitUppercase: digitUppercase,
    getSN: getSN
} 
