var userSettings = require('./user-settings');


var substitutionsTextArea = document.querySelector('.subs-list')
substitutionsTextArea.value = userSettings.get('subs').reduce(function(str, sub){ return str + sub[0] + ' ' + sub[1] + '\n'}, '');


document.querySelector('.update-subs').addEventListener('click', function() {
  userSettings.set('subs', substitutionsTextArea.value.split('\n').map(function(line){
    return line.split(' ');
  }).filter(function(sub) { return sub && sub.length == 2 }));
  window.location.href = window.location.origin;
});
