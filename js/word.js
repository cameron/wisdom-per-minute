var evt = require('./evt'),
    dom = require('./dom');

var delays = {
  shortWord: 1.2,
  comma: 2,
  period: 3,
  paragraph: 3.5,
  longWord: 1.5
};

var w = {
  getDelay: function(node){
    var word = node.word;
    if(word == "Mr." ||
        word == "Mrs." ||
        word == "Ms.") return 1;
    var lastChar = word[word.length - 1];
    if(lastChar.match('”|"')) lastChar = word[word.length - 2];
    if(lastChar == '\n') return delays.paragraph
    if('.!?'.indexOf(lastChar) != -1) return delays.period;
    if(',;:–'.indexOf(lastChar) != -1) return delays.comma;
    if(word.length < 4) return delays.shortWord;
    if(word.length > 11) return delays.longWord
    return 1;
  },

  // ORP: Optimal Recgonition Point
  getORPIndex: function(word){
    var length = word.length;
    var lastChar = word[word.length - 1];
    if(lastChar == '\n'){
      lastChar = word[word.length - 2];
      length--;
    }
    if(',.?!:;"'.indexOf(lastChar) != -1) length--;
    return length <= 1 ? 0 :
      (length == 2 ? 1 :
          (length == 3 ? 1 :
              Math.floor(length / 2) - 1));
  },

  toNode: function(word) {
    var node = dom.makeDiv({'class': 'word'});
    node.word = w.parseSQInstructionsForWord(word, node);

    var orpIdx = w.getORPIndex(node.word);

    node.word.split('').map(function charToNode(char, idx) {
      var span = dom.makeEl('span', {}, node);
      span.textContent = char;
      if(idx == orpIdx){
        span.classList.add('orp');
        node.orp = span;
      }
    });

    node.delayFactor = w.getDelay(node);

    return node;
  },

  // markup used for controlling the speed of the demo text
  instructionsRE:  /#SQ(.*)SQ#/,
  parseSQInstructionsForWord: function(word, node){
    var match = word.match(w.instructionsRE);
    if(match && match.length > 1){
      node.instructions = [];
      match[1].split('#')
      .filter(function(w){ return w.length; })
      .map(function(instruction){
        var val = Number(instruction.split('=')[1]);
        node.instructions.push(function(){
          evt.dispatch('squirt.wpm', {value: val})
        });
      });
      return word.replace(w.instructionsRE, '');
    };
    return word;
  }
}

module.exports = w;
