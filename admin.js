(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var userSettings = require('./user-settings');


var substitutionsTextArea = document.querySelector('.subs-list')
substitutionsTextArea.value = userSettings.get('subs').reduce(function(str, sub){ return str + sub[0] + ' ' + sub[1] + '\n'}, '');


document.querySelector('.submit-sub').addEventListener('click', function() {
  console.log('asdf');
  var subs = userSettings.get('subs');
  subs.push([document.querySelector('.search-term').value, document.querySelector('.replacement').value])
  userSettings.set('subs', subs)
  window.location.href = window.location.origin;
});

document.querySelector('.update-subs').addEventListener('click', function() {
  userSettings.set('subs', substitutionsTextArea.value.split('\n').map(function(line){
    return line.split(' ');
  }).filter(function(sub) { return sub && sub.length == 2 }));
  window.location.href = window.location.origin;
});

document.querySelector('.small').addEventListener('click', function(){
  document.querySelector('.find-replace').style = 'display: none';
  document.querySelector('.list').style = 'display: block';
});

},{"./user-settings":2}],2:[function(require,module,exports){

var localStorageKey = 'userSettings'
var settings = load();

function save(){
  window.localStorage[localStorageKey] = JSON.stringify(settings);
}

function load(){
  return JSON.parse(window.localStorage[localStorageKey] || "{}");
}

var m = {
  get: function(k, defVal){
    if(settings[k] === undefined){
      m.set(k, defVal);
      return defVal;
    };
    return settings[k];
  },
  set: function(k,v){
    settings[k] = v;
    if(v === undefined){
      delete settings[k];
    }
    save();
  }
};

module.exports = m;
},{}]},{},[1]);
