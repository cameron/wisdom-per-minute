var dom = require('./dom'),
    evt = require('./evt'),
    sq = require('./sq');

function updateProgressBar(location){
  var progress = Math.round(location.x * 100);
  dom.qs('.scrubber-bar-left').style.width = progress + '%';
  dom.qs('.scrubber-bar-right').style.width = (100 - progress) + '%';
  dom.qs('.scrubber-bar-right').style.left = progress + '%';
}

var scrubber = dom.qs('.scrubber');
var scrubberKnob = dom.qs('.scrubber-knob');
var setDraggableXY = dom.draggable(scrubberKnob, {
  disableY: true,
  x: {
    min:0,
    max: scrubber.offsetWidth - 19
  }
  // note about magic number 19:
  // scrubberKnob.offsetWidth reports 60px before the icon font kicks in
});

evt.on(scrubberKnob, 'drag', function(e){
  evt.dispatch('squirt.seek', {location: e.location});
  updateProgressBar(e.location);
  e.preventDefault();
});

evt.on(scrubberKnob, 'dragged', evt.dispatch.bind(null, 'squirt.play', {}, null));

evt.on('squirt.progress', function(e){
  updateProgressBar({x: sq.progress});
  setDraggableXY(sq.progress);
});

var timeToRead = dom.qs('.time-to-read');
dom.bind("{{ duration }} mins", sq, timeToRead);
evt.on('squirt.wpm.echo', timeToRead.render);
