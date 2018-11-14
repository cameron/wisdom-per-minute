(function(){
  sq = window.sq = window.sq || {};
  if(sq.script){
    sq.again();
  } else {
    sq.bookmarkletVersion = '0.3.0';
    sq.iframeQueryParams = {
      host: '//squirt.io',
      userId: '--squirtUser--',
    };
    sq.script = document.createElement('script');
    sq.script.src = sq.iframeQueryParams.host + '/bookmarklet/frame.outer.js';
    document.body.appendChild(sq.script);
  }
})();
