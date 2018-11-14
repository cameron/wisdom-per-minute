
var js = {

  array: function(listLike){
    return Array.prototype.slice.call(listLike);
  },

  // invoke([f1, f2]); // calls f1() and f2()
  // invoke([o1, o2], 'func'); // calls o1.func(), o2.func()
  // args are applied to both invocation patterns
  invoke: function(objs, funcName, args){
    args = args || [];
    var objsAreFuncs = false;
    switch(typeof funcName){
      case "object":
      args = funcName;
      break;
      case "undefined":
      objsAreFuncs = true;
    };
    return objs.map(function(o){
      return objsAreFuncs ? o.apply(null, args) : o[funcName].apply(o, args);
    });
  },

  map2d: function(arr1, arr2, mapper){
    return arr1.map(function(obj1, idx1, arr1){
      return arr2.map(function(obj2, idx2, arr2){
        mapper(obj1, obj2, idx1, idx2, arr1, arr2);
      });
    });
  },

  tick: function(f, timeout){
    return setTimeout(f, timeout || 0);
  },

  // Returns a function that will return the value at `key`
  // from its first argument.
  //
  // The returned function also has a `then` method, which is
  // a shortcut to a promise that resolves to the value that
  // the created getter function returns.
  getter: function(key){
    var givesTo = [];
    var getter = function(obj){
      var v = obj[key]
      givesTo.map(function(f){ f(v); });
      return v;
    }
    getter.giveTo = function(f){
      givesTo.push(f);
      return getter;
    }
    return getter;
  },

  invoker: function(){
    var args = js.array(arguments);
    return function(){
      js.invoke(args);
    }
  },
};

module.exports = js;