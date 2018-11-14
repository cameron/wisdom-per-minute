var    _ = require('underscore'),
    js = require('./js');

// TODO
// drop this weird default global bus pattern in
// favor of explicit emitters

var evt = {

  // argument processing for `on` and `once`
  // (I am genuinely sorry about these three functions.)
  _onArgs: function(buses, evts, cb){
    // two forms
    // - on(evt, callback) -> add listener to document
    // - on(bus, evt, callback) -> add listener to bus
    if(cb === undefined){
      cb = evts;
      evts = buses;
      buses = [document];
    }
    if(buses.splice === undefined) buses = [buses];
    evts = evts.split(' ');
    return [buses, evts, cb, true];
  },

  handle: function(evtsToHandlers){
    _.keys(evtsToHandlers).map(function(evtStr){
      evt.on(evtStr, evtsToHandlers[evtStr]);
    });
  },

  on: function(buses, evts, cb, processedArgs){
    if(!processedArgs) return evt.on.apply(null, evt._onArgs.apply(null, arguments));
    js.map2d(buses, evts, function(bus, evt){
        bus.addEventListener(evt, cb);
    })
    return function(){
      js.map2d(buses, evts, function(bus, evt){
        bus.removeEventListener(evt, cb);
      });
    }
  },

  once: function(bus, evts, cb, processedArgs){
    if(!processedArgs) return evt.once.apply(null, evt._onArgs.apply(null, arguments));
    var remover, newCallback = function(e){ remover(); return cb(e); }
    remover = evt.on.call(null, bus, evts, newCallback, true);
  },

  dispatch: function(evtStr, attrs, dispatcher){
    var e = new Event(evtStr);

    for(var k in attrs){
      if(!attrs.hasOwnProperty(k)) continue
      e[k] = attrs[k];
    }

    (dispatcher || document).dispatchEvent(e);

    // squirt.*.echo is subscribed to by rendering routines
    if(evtStr.indexOf('echo') == -1){
      js.tick(function(){ evt.dispatch(evtStr + '.echo');});
    }
  },
}

module.exports = evt;
