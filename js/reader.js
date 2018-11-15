var _ = require('underscore'),
    evt = require('./evt'),
    js = require('./js'),
    dom = require('./dom'),
    q = require('q'),
    word = require('./word'),
    carousel = require('./carousel'),
    userSettings = require('./user-settings');

require('./gui');


// We multiply the average delay per word by the user-set WPM to
// obtain a baseline per-word interval that, when modified by
// each word's specific delay value, will approach the user's
// desired speed.
var avgDelayPerWord = null;

// TODO the location of these event handlers is inconsistent.
// some are here, some are in the main.iframe module. sort it out.
evt.handle({
  'squirt.rewind.start': carousel.seekBackward,
  'squirt.rewind.stop': carousel.stopSeeking,
  'squirt.ff.start': carousel.seekForward,
  'squirt.ff.stop': carousel.stopSeeking,
  'squirt.seek': js.getter('location').giveTo(carousel.seek),
  'squirt.changeFont': changeFont
});

function readabilityFail(){
  dom.qs('.error').innerHTML = 'Oops! This page is too hard for Squirt to read. We\'ve been notified, and will do our best to resolve the issue shortly.';
};

function textToNodes(text) {
  text = text.trim('\n').replace(/\s+\n/g,'\n');
  var totalDelay = 0;
  var nodes = text
         .replace(/[-—\,\.\!\:\;](?![\"\'\)\]\}])/g, "$& ")
         .split(/[\s]+/g)
         .filter(function(word){ return word.length; })
         .map(word.toNode)
         .map(function(node){ totalDelay += node.delayFactor; return node});
  avgDelayPerWord = totalDelay / nodes.length;
  return nodes;
};

function changeFont(e){
  var reader = dom.qs('.reader');
  reader.classList.remove('sans');
  if(e.sans) reader.classList.add('sans');
  rebuildNodes(true);
}

var rebuildNodes = function willGetReplaced(){};


var subverstitute = function(text) {
  userSettings.get('subs', []).map(function(sub) {
    text = text.replace(new RegExp(sub[0],'gi'), sub[1]);
  });
  return text;
}

module.exports = {
  subverstitute: subverstitute,

  setText: function(text){
    rebuildNodes = function(preserveIdx){
      carousel.setNodes(textToNodes(subverstitute(text)), preserveIdx);
    }
    rebuildNodes();
  },

  stop: carousel.pause,

  wpm: function(targetWPM){
    carousel.wpm(targetWPM * avgDelayPerWord);
  },

  play: function(extraSlowStart){
    carousel.play(extraSlowStart);
  },

  currentContextWords: function(){
    return _.pluck(carousel.contextNodes(), 'word');
  }
}
