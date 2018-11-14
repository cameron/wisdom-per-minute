// `sq` is global object and event bus used inside the squirt iframe
// (different from `sq` in the parent frame)

var _ = require('underscore'),
    dom = require('./dom');

var sq = window.sq = window.sq || {};
sq.context = 'inner';
_.extend(sq, dom.fromQueryString());
module.exports = sq;