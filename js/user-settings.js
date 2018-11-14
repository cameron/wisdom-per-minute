
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