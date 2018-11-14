var sq = require('./sq'),
    evt = require('./evt');

var downKeys = {}; // track pressed keys
var keyHandlers = {
    keydown: {
      32: togglePlay,
      27: evt.dispatch.bind(null, 'squirt.close', {}, null),
      38: evt.dispatch.bind(null, 'squirt.wpm.adjust', {value: 10}, null),
      40: evt.dispatch.bind(null, 'squirt.wpm.adjust', {value: -10}, null),
      37: evt.dispatch.bind(null, 'squirt.rewind.start', {}, null),
      39: evt.dispatch.bind(null, 'squirt.ff.start', {}, null)
    },
    keyup: {
      37: evt.dispatch.bind(null, 'squirt.rewind.stop', {}, null),
      39: evt.dispatch.bind(null, 'squirt.ff.stop', {}, null),
      83: evt.dispatch.bind(null, 'squirt.toggleSettings', {}, null)
    }
};

function togglePlay(){
  evt.dispatch('squirt.' + (sq.playing ? 'pause' : 'play'));
}

// for keys that have a keyup handler, prevent keydown from
// firing repeatedly when held 
function keyAlreadyDown(e){
  if(e.type == 'keydown' && keyHandlers['keyup'][e.keyCode] !== undefined){
    if(downKeys[e.keyCode]) return true;
    downKeys[e.keyCode] = true;
  } else {
    delete downKeys[e.keyCode];
  }
  return false;
}

function keyHasAtLeastOneHandler(keyCode){
  return keyHandlers['keyup'][keyCode] || keyHandlers['keydown'][keyCode];
}

module.exports = function(){
  evt.on('keydown keyup', function keyEvent(e){
    if(!keyHasAtLeastOneHandler(e.keyCode)) return true;
    if(keyAlreadyDown(e)) return e.preventDefault(); // has side effects
    var handler = keyHandlers[e.type][e.keyCode];
    if(!handler) return true;
    handler && handler(e);
    return e.preventDefault();
  });
}
