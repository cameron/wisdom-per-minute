var userSettings = require('./user-settings');


var substitutionsTextArea = document.querySelector('.subs-list')
substitutionsTextArea.value = userSettings.get('subs').reduce(function(str, sub){ return str + sub[0] + ' ' + sub[1] + '\n'}, '');


document.querySelector('.submit-sub').addEventListener('click', function() {
  console.log('asdf');
  var subs = userSettings.get('subs');
  subs.push([document.querySelector('.search-term').value, document.querySelector('.replacement').value])
  userSettings.set('subs', subs)
  window.location.href = window.location.origin;
});

document.querySelector('.update-subs').addEventListener('click', function() {
  userSettings.set('subs', substitutionsTextArea.value.split('\n').map(function(line){
    return line.split(' ');
  }).filter(function(sub) { return sub && sub.length == 2 }));
  window.location.href = window.location.origin;
});

document.querySelector('.small').addEventListener('click', function(){
  document.querySelector('.find-replace').style = 'display: none';
  document.querySelector('.list').style = 'display: block';
});
