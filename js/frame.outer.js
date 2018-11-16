var _ = require('underscore'),
    jtf = require('./just-the-facts'),
    dom = require('./dom'),
    evt = require('./evt'),
    fs = require('fs'),
    loading = require('./loading'),
    js = require('./js');

var initialized = false; // used in the re-install flow
var sq = window.sq;
sq.innerFrame = null;
sq.pageScriptVersion = '0.3.0';


!function initSquirt(){

  // reinstall flow
  if(!upToDate()) return reinstall();

  // after reinstall, if the user clicks the new bookmarklet without refreshing...
  var reinstallDialog = dom.qs('.sq-reinstall-wrapper');
  reinstallDialog && reinstallDialog.remove();

  // loading view
  loading.show();
  sq.pageContent = jtf.grabArticleText();

  dom.injectStylesheet(sq.iframeQueryParams.host + '/bookmarklet/css/frame.outer.css');

  // inject reader iframe
  _.extend(sq.iframeQueryParams, {
    parentOrigin: window.location.origin,
    parentHref: window.location.href,
    parentHostname: window.location.hostname,
    parentReferrer: document.referrer,
    onboarding: sq.demoText ? true : ''
  });

  var iframeSrc = window.location.protocol +
    sq.iframeQueryParams.host +
    '/bookmarklet/views/iframe.html?' +
    dom.toQueryString(sq.iframeQueryParams);

  sq.innerFrame = createIframe(iframeSrc, _.compose(
    loading.hide,
    setText));

  // events
  require('./cross-frame-events');
  sq.context = 'outer';
  evt.on('squirt.play', blurPage);
  evt.on('squirt.pause', unblurPage);
  evt.on('squirt.redirect', function(e){
    window.location.href = e.href;
  });
  evt.on('squirt.close', function(){
    sq.innerFrame.classList.add('closed');
    sq.innerFrame.contentWindow.blur();
    window.focus()
    unblurPage()
  });
  evt.on('squirt.pageBodyOffsetTop', function(e){
    document.body.style.top = 0 + 'px';
    dom.transition(document.body, e.duration, {target: 'top'});
    js.tick(function(){document.body.style.top = e.top + 'px'},0);
  });

  // apply transitions class for smooth blur during play/pause
  js.array(document.body.children).map(function(node){
    node.classList.add('sq-trans');
  });

}(initialized = true);

function upToDate(){
  return sq && sq.bookmarkletVersion && sq.bookmarkletVersion.localeCompare(sq.pageScriptVersion) == 0;
}

function reinstall(){
  var reinstallHtml = fs.readFileSync(__dirname + '/../views/reinstall.html', 'utf8')
                      .replace('--squirtUser--', sq.userId);

  delete window.sq; // allows user to use the new bm without reloading
}

function createIframe(src, onLoad){
  var frame = dom.makeEl('iframe', {
    src: src,
    class: 'sq-frame'}, document.body);
  frame.style.border = 0
  frame.addEventListener('load', function(){
    onLoad && onLoad();
    frame.focus();
    dom.transition(document.body)
  });
  return frame;
};

function blurPage(){
  js.array(document.body.children)
  .filter(function(node){ return !node.classList.contains('sq-frame') })
  .map(dom.addClass('sq-blur'));
};

function unblurPage(){
  js.array(document.body.children).map(function(node){
    node.classList.remove('sq-blur');
  });
}

function setText(){
  var text = sq.demoText || dom.getSelectedText() || sq.pageContent;
  evt.dispatch('squirt.setText', {text: text});
}

sq.again = function(didWaitForBlur){
  // handle the situation where the user clicks the bookmarklet immediately
  // after reinstalling
  if(!initialized) return initSquirt();
  sq.innerFrame.classList.remove('closed');
  setText();
  if(didWaitForBlur) return evt.dispatch('squirt.play', {extraSlowStart: true});

  blurPage();
  setTimeout(function(){ sq.again(true) }, 250);
};
