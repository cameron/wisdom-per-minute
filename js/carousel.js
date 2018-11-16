// This file is a conceptual mess. Apologies to my future self and others.

var _ = require('underscore'),
    sq = require('./sq'), // would love to get this out of here
    q = require('q'),
    dom = require('./dom'),
    js = require('./js'),
    evt = require('./evt');

sq.playing = true;
sq.rewinding = false;

// TODO reduce the amount of global state in this file,
// use a more functional approach
var intervalMs,
    _wpm,
    seekPPS = { // pixels per second
      start: 650,
      accel: 40,
      max: 1200,
      current: undefined
    },
    nodeIdx = 0,
    nextNodeTimeoutId,
    focusNode,
    focusNodePrev,
    slowStartIdx,
    carousel = dom.qs('.carousel'),
    nodesContainer = dom.qs('.carousel .nodes'),
    clearSeekTransition,
    clearSeekTransitionUpdater;

var anims = {
  showContext: {
    ms: 150,
  },
  hideContext: {
    extraSlowFactor: 2.8,
    ms: 600,
    word: { ms: 300 }
  }
};

var updateAndDispatchProgress = _.throttle(function(){
  sq.progress = nodeIdx / c.nodes.length;
  evt.dispatch('squirt.progress');
}, 250);

var getNextNodeIdx = incrementNodeIdx;
function decrementNodeIdx(){
  if(nodeIdx > 0) return nodeIdx--;
};

function incrementNodeIdx(){
  if(nodeIdx < c.nodes.length - 1) return ++nodeIdx;
}

function seekingFFOrRewind(){ // i.e., not dragging
  return sq.seeking && sq.seeking != 'drag';
}

function waitOnNode(node){
  var d = q.defer();

  // if we'r ff/rewinding, advance as soon as the current transition ends
  if(seekingFFOrRewind()){
    evt.once(nodesContainer, dom.transitionEndEvents, d.resolve);

  // otherwise, we're playing, so resolve the promise after displaying the node
  } else {
    setTimeout(function(){
      if(!sq.playing && !seekingFFOrRewind()) return d.reject(); // paused
      d.resolve();
    },
      intervalMs * (focusNode.delayFactor + slowStartFactor()));
  }
  return d.promise;
}

function noMoreNodes(){
  if(nodeIdx != c.nodes.length - 1) return;
  nodeIdx = 0;
  return evt.dispatch('squirt.carousel.end');
}

function advanceNode(){
  if(!getNextNodeIdx()) return noMoreNodes();
  updateAndDispatchProgress();
  focusOnNodeAtIdx(nodeIdx);
  waitOnNode(c.nodes[nodeIdx]).then(advanceNode);
};

var sliceSize = 30;
function focusOnNodeAtIdx(idx) {
  if (!c.nodesSlice ||
      idx < c.nodesSliceStart + 10 ||
      idx > c.nodesSliceStart + sliceSize - 10) {
    nodesContainer.innerHTML = '';
    if (getNextNodeIdx == incrementNodeIdx) {
      c.nodesSliceStart = Math.max(0, idx - 10);
    } else {
      c.nodesSliceStart = Math.max(0, idx + 10 - sliceSize);
    }
    c.nodesSlice = c.nodes.slice(c.nodesSliceStart, c.nodesSliceStart + sliceSize);
    dom.appendChildren(nodesContainer, c.nodesSlice);
  }

  // the focusNodePrev business avoids animating
  // the focusNode from opacity 1 to 0, which is otherwise
  // incurred by the opacity transition applied to .word
  focusNode && (
    focusNode.classList.remove('focus-node'),
    focusNode.classList.add('focus-node-prev')
  );
  focusNodePrev && focusNodePrev.classList.remove('focus-node-prev');
  focusNodePrev = focusNode;

  focusNode = c.nodes[idx];
  focusNode.classList.add('focus-node');
  centerOnFocus();

  // used to control landing page demo WPM
  focusNode.instructions && js.invoke(focusNode.instructions);
};

function centerOnFocus(){
  var orpNode = focusNode.querySelector('.orp');
  nodesContainer.style.left = "-" + (orpNode.offsetLeft + orpNode.offsetWidth / 2) + "px";
};

function contextNodes(ctxNodeRange){
  var nodes = [];
  var idx = Math.max(0, nodeIdx); // hack -- nodeIdx is -1 on start
  if (!c.nodes) return console.log('nodes not yet set')
  return c.nodes
         .slice(Math.max(0,idx - ctxNodeRange), idx)
         .concat(
           c.nodes.slice(idx,
             Math.min(idx + ctxNodeRange, c.nodes.length)));
};

function slowStartFactor(){
  if(wordsSincePlay > 24) return 0;
  var wordsSincePlay = nodeIdx - slowStartIdx;
  return 2.2 * (1 / wordsSincePlay) - .1;
};

function hideContextNodes(extraSlow){
  var def = q.defer();
  var animationLength = anims.hideContext.ms;
  animationLength *= extraSlow ? anims.hideContext.extraSlowFactor : 1;
  var wordsAnimationLength = animationLength * .7;
  var ctxNodeRange = 10;
  var ctxNodes = contextNodes(ctxNodeRange);
  var focusIdx = ctxNodes.indexOf(focusNode);
  ctxNodes.map(function(node, idx){
    if(node.classList.contains('focus-node')) return;
    node.classList.add('serial-fade');
    var delayFactor = (ctxNodeRange - Math.abs(idx - focusIdx)) / ctxNodeRange;
    q.delay(delayFactor * wordsAnimationLength)
    .then(function(){ node.classList.remove('serial-fade')});
  });
  return q.delay(animationLength);
};

var linearLeft = {target: 'left', type: 'linear'};
function constantPPSTransition(directionIdx){
  var distance = Math.abs(focusNode.orp.offsetLeft - c.nodes[nodeIdx + directionIdx].orp.offsetLeft);
  var ms =  distance * 1000 / seekPPS.current;
  return dom.transition(nodesContainer, ms, linearLeft);
}

function setupSeekTransition(){
  // ease into the seek, and then use a linear transition adjusted for constant speed
  seekPPS.current = seekPPS.start;
  var directionIdx = sq.seeking == 'backward' ? -1 : 1;
  clearSeekTransition = dom.transition(nodesContainer, 200, {target: 'left', type: 'ease-in'});
  clearSeekTransitionUpdater = evt.on(nodesContainer, dom.transitionEndEvents, function(e){
    if(e.target != nodesContainer) return;
    seekPPS.current = Math.min(seekPPS.max, seekPPS.current + seekPPS.accel);
    clearSeekTransition = constantPPSTransition(directionIdx);
  });
};

function setSeekState(state){
  if(state === sq.seeking) return;

  getNextNodeIdx = state == 'backward' ? decrementNodeIdx : incrementNodeIdx;

  var wasSeeking = sq.seeking;
  sq.seeking = state;
  if(wasSeeking) return; // catch an instantaneous switch from forwards to backwards?

  carousel.classList.add('seeking');
  c.pause();

  if(state == 'drag') return; // for scrubber

  setupSeekTransition();
  advanceNode();
};

function clearSeek(){
  sq.seeking = false;
  carousel.classList.remove('seeking');
}


var c = {
  hide: dom.hide.bind(null, carousel),
  show: dom.show.bind(null, carousel),
  nodes: null,
  nodesSlice: null,
  nodesSliceStart: NaN,

  pause: function(){
    if(!sq.playing) return;
    sq.playing = false;
    carousel.classList.remove('playing');
  },

  play: function(extraSlowStart){
    clearSeek();
    sq.playing = true;
    getNextNodeIdx = incrementNodeIdx;
    carousel.classList.add('playing');

    slowStartIdx = nodeIdx;

    hideContextNodes(extraSlowStart)
    .then(advanceNode);
  },

  wpm: function(wpm){
    _wpm = wpm;
    intervalMs = 60 * 1000 / wpm;
    if (c.nodes) {
      sq.duration = (c.nodes.length * intervalMs / 1000 / 60).toFixed(1);
    }
  },

  seek: function(location){
    setSeekState('drag');
    nodeIdx = Math.floor(location.x * c.nodes.length);
    focusOnNodeAtIdx(nodeIdx);
  },

  seekForward: _.partial(setSeekState, 'forward'),

  seekBackward: _.partial(setSeekState, 'backward'),

  stopSeeking: function(){
    sq.seeking = false;
    clearSeekTransitionUpdater();
    evt.once(nodesContainer, dom.transitionEndEvents, clearSeekTransition);
  },

  setNodes: function(childNodes, preserveIdx){
    c.nodes = childNodes;

    // cache offsets to optimize rendering
    childNodes.map(function(node){
      node.orp.offsetLeftCached = node.orp.offsetLeft;
      node.orp.offsetWidthCached = node.orp.offsetWidth;
    });

    !preserveIdx && (nodeIdx = 0);
    focusOnNodeAtIdx(nodeIdx);
  },

  contextNodes: function(){
    return contextNodes(5);
  }
};

c.wpm(400)

module.exports = c;
