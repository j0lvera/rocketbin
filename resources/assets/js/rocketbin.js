import ace from 'brace-ace';

require('brace-ace/theme/monokai');
require('brace-ace/theme/github');
require('brace-ace/mode/html');
require('brace-ace/mode/css');
require('brace-ace/mode/sass');
require('brace-ace/mode/scss');
require('brace-ace/mode/coffee');
require('brace-ace/mode/python');
require('brace-ace/mode/ruby');
require('brace-ace/mode/php');
require('brace-ace/mode/snippets');
require('brace-ace/ext/language_tools');
require('brace-ace/ext/emmet');
require('brace-ace/keybinding/vim');
require('brace-ace/keybinding/emacs');

let d = document;

function Editor() {
  // UI
  this.keyBindingEl = d.getElementById('keybinding');
  this.syntaxEl = d.getElementById('syntax');

  // Start Ace editor
  this.editor = ace.edit('editor');
};

Editor.prototype.init = function() {
  this.setDefaultOptions();
  this.bindUI();
};

Editor.prototype.setDefaultOptions = function() {
  this.editor.setOptions({
    wrap: true,
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true,
    behavioursEnabled: true
  });

  this.setTheme('github');
  this.setMode('javascript');
  this.setKeybinding('keybinding')
};

Editor.prototype.bindUI = function() {
  this.keyBindingEl.addEventListener('change', function(e) {
    this.setKeybinding(e.target.value); 
  }.bind(this))

  this.syntaxEl.addEventListener('change', function(e) {
    this.setMode(e.target.value);
  }.bind(this))
};

Editor.prototype.setKeybinding = function(keybinding) {
   this.editor.setKeyboardHandler('ace/keyboard/' + keybinding);
};

Editor.prototype.setTheme = function(theme) {
  console.log("changing theme to: ", theme);

  this.editor.setTheme('ace/theme/' + theme);
};

Editor.prototype.setMode = function(mode) {
  console.log("setting mode: ", mode);

  const session = this.editor.session;
  // https://github.com/ajaxorg/ace/issues/1142
  if (mode === 'php') {
    session.setMode({path: 'ace/mode/php', inline: true})
  } else {
    session.setMode('ace/mode/' + mode);
  }
}

var rocketbin = new Editor();
rocketbin.init();
