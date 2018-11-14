var dom = require('./dom'),
    evt = require('./evt'),
    fs = require('fs');

var loading = {
  wrapperEl: null,

  show: function(){
    var loadingHtml = fs.readFileSync(__dirname + '/../views/loading.html');
    loading.wrapperEl = dom.compileHtml(loadingHtml);
    document.body.appendChild(loading.wrapperEl);
    dom.addClass(dom.qs('.sq-loading'), 'visible');
  },

  hide: function(){
    var el = dom.qs('.sq-loading');
    el.classList.remove('visible');
    evt.once(el, dom.transitionEndEvents, function(){
      loading.wrapperEl.remove();
    });
  },
};

module.exports = loading;