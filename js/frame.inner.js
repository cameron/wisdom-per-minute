var sq = require('./sq'),
    evt = require('./evt'),
    dom = require('./dom'),
    js = require('./js'),
    _ = require('underscore'),
    reader = require('./reader'),
    $ = require('jquery'),
    userSettings = require('./user-settings');

var modal = dom.qs('.modal');


// TODO the location of these event handlers is inconsistent.
// some are here, some are in the reader module. sort it out.
var events = {
  'squirt.pause': function(e){
    reader.stop();
    evt.dispatch('squirt.scrollToWords', {words:reader.currentContextWords()});
    document.body.classList.remove('playing');
  },

  'squirt.play': function(e){
    dom.show('.carousel');
    reader.play(e.extraSlowStart);
    document.body.classList.add('playing');
  },

  'squirt.wpm.adjust': function(e){
    evt.dispatch('squirt.wpm', {value: e.value + sq.wpm});
  },

  'squirt.wpm': function(e){
    sq.wpm = Number(e.value);
    userSettings.set('wpm', sq.wpm);
    reader.wpm(sq.wpm);
  },

  'squirt.setText': function(e){
    reader.setText(e.text)
    evt.dispatch('squirt.wpm', {value: userSettings.get('wpm', 450)});
  },

  'squirt.toggleSettings': function(){
   evt.dispatch('squirt.' + (modal.offsetTop == 0 ? 'closeSettings' : 'showSettings'));
  },

  'squirt.changeFont': function(e){
    userSettings.set('sansFont', e.sans);
  },

  // ideally, we're not listening to the carousel directly
  'squirt.carousel.end': getText

};

evt.handle(events);

var title = dom.qs('.title');

function getText(){
  $.get('/text/' + title.selectedIndex, function(res){
    evt.dispatch('squirt.pause');
    setTimeout(function(){
    evt.dispatch('squirt.setText', {'text': res.text});
      setTimeout(function() {
        evt.dispatch('squirt.play');
      })
    })
  });
}

function getTexts (success) {
  $.get('/text/', function(res) {
    res.texts.map(function(text_title, idx){
      var opt = document.createElement('option');
      opt.value = idx;
      opt.innerText = text_title;
      title.appendChild(opt);
    });
    success();
  });
}

getTexts(getText);

evt.on(title, 'change', getText)

evt.on(dom.qs('.next-doc'), 'click', function(){ alert("The teacher will present him/her/itself when the student is ready.")});
evt.on(dom.qs('.prev-doc'), 'click', function(){ alert("The past is an illusion.") });
