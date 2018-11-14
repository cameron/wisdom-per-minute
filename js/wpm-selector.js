var sq = require('./sq'),
    evt = require('./evt'),
    dom = require('./dom');

var wpm = dom.qs('.wpm-count');

dom.bind("{{wpm}}", sq, wpm);

evt.on('squirt.wpm.echo', wpm.render);

evt.on(dom.qs('.wpm-up'), 'click', function(){
  evt.dispatch('squirt.wpm.adjust', {value: 20});
});

evt.on(dom.qs('.wpm-down'), 'click', function(){
  evt.dispatch('squirt.wpm.adjust', {value: -20});
});

wpm.render();
