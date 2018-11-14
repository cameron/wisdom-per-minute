var evt = require('./evt');

evt.on(window, 'message', function(e){
  var data = e.data;
  var event = data.event;
  if(event === undefined) return;
  delete data.event;
  if(event.match(/squirt\./)) evt.dispatch(event, data);
});
