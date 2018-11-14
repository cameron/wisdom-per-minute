var _ = require('underscore');

var keys = {
  prod: {
    projectId: "531d7ffd36bf5a1ec4000000",
    writeKey: "9bdde746be9a9c7bca138171c98d6b7a4b4ce7f9c12dc62f0c3404ea8c7b5415a879151825b668a5682e0862374edaf46f7d6f25772f2fa6bc29aeef02310e8c376e89beffe7e3a4c5227a3aa7a40d8ce1dcde7cf28c7071b2b0e3c12f06b513c5f92fa5a9cfbc1bebaddaa7c595734d"
  },
  dev: {
    projectId: "531aa8c136bf5a0f8e000003",
    writeKey: "a863509cd0ba1c7039d54e977520462be277d525f29e98798ae4742b963b22ede0234c467494a263bd6d6b064413c29cd984e90e6e6a4468d36fed1b04bcfce6f19f50853e37b45cb283b4d0dfc4c6e7a9a23148b1696d7ea2624f1c907abfac23a67bbbead623522552de3fedced628"
  }
}

var ref = document.referrer;
var refHost = ref && document.referrer.match(/(?:\/\/)[^/:]+/)[0].substr(2)
var globalEventProperties = {
  source: "bookmarklet",
  href: window.location.href,
  hostname: window.location.hostname,
  rawUserAgent: "${keen.user_agent}",
  ip: "${keen.ip}",
  keen: { addons: [
    addon("keen:ip_to_geo", { ip: "ip" }, "geo"),
    addon("keen:ua_parser", { ua_string: "rawUserAgent" }, "userAgent")
  ]},
  referrer: ref,
  referrerHost: refHost
};

function addon(name, input, output){
  return { name: name, input: input, output: output};
}

function guid(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

var Keen = (function init(){
  var Keen = window.Keen = {
    configure:function(e){this._cf=e},
    addEvent:function(e,t,n,i){this._eq=this._eq||[],this._eq.push([e,t,n,i])},
    setGlobalProperties:function(e){this._gp=e},
    onChartsReady:function(e){this._ocrq=this._ocrq||[],this._ocrq.push(e)}
  };

  var e=document.createElement("script");
  e.type="text/javascript",e.async=!0,e.src="//dc8na2hxrj29i.cloudfront.net/code/keen-2.1.0-min.js";
  var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t)
  Keen.configure(window.location.host.match('squirt\.io') ? keys.prod : keys.dev);
  Keen.setGlobalProperties(function(){
    return _.extend({}, globalEventProperties);
  });
  return Keen;
})();


module.exports = {
  addEvent: Keen.addEvent.bind(Keen),
  always: _.partial(_.extend, globalEventProperties),
  globalProps: globalEventProperties
};
