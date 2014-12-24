var s,
  d = document,
  editor = ace.edit("editor"),

app = {
  settings: {
    // Defaults
    lang: "html",
    theme: "github",
    keybinding: "none",
    // UI
    optionLanguage: d.getElementById('language'),
    optionTheme: d.getElementById('theme'),
    optionKeybinding: d.getElementById('keybinding'),
    form: d.getElementById('form-save-code'),
    btnDelete: $('.btnDelete') 
  },

  init: function() {
    s = this.settings;       

    // start app
    this.setDefaultOptions();
    this.bindUI();
  },

  bindUI: function() {
    s.optionLanguage.addEventListener('change', app.changeLang);
    s.optionKeybinding.addEventListener('change', app.changeKeybinding);
    // s.optionTheme.addEventListener('change', app.changeTheme);
    s.form.addEventListener('submit', app.saveCode);
  },

  setKeybinding: function(keybinding) {
    editor.setKeyboardHandler("ace/keyboard/" + keybinding);              
  },

  setDefaultOptions: function() {
    ace.require("ace/ext/language_tools"); 
    ace.require("ace/ext/emmet"); 

    // http://stackoverflow.com/questions/22262136/ace-editor-with-vim-mode-and-emmet-enabled
    editor.setOption("EnableEmmet", true);

    this.setTheme(s.theme);
    this.setLang(s.lang);

    editor.setOptions({
      // wrap: true,
      enableBasicAutocompletion: true,
      enableSnippets: true,
      enableLiveAutocompletion: true,
      behavioursEnabled: true
    });         
  },

  setLang: function(lang) {
    if (lang != "html") {
      editor.setOption("enableEmmet", false);
    } else {
      editor.setOption("enableEmmet", true);
    }

    editor.getSession().setMode("ace/mode/" + lang);
  },

  setTheme: function(theme) {
    editor.setTheme("ace/theme/" + theme);
  },

  changeKeybinding: function() {
    value = this.value;
    s.keybinding = value;
    app.setKeybinding(value);
  },
  
  changeLang: function() {
    value = this.value;
    s.lang = value;
    app.setLang(value);
  },

  changeTheme: function() {
    value = this.value;
    s.theme = value;
    app.setTheme(value);
  },

  deleteCode: function(e) {
    e.preventDefault();
    var $this = $(this);               

    console.log($this);
  },

  saveCode: function(e) {
    e.preventDefault();           
    var code = editor.getValue();

    if (code != '') {
      $.ajax({
        url: '/paste/save',
        data: { code: code, lang: s.lang, theme: s.theme },
        type: 'POST',
        success: function(data) {
          var status = $.parseJSON(data);

          if (status._id) {
            location.href = location.href + 'paste/' + status._id;
          }
        },
        error: function(data) {
          console.dir(data);
          console.log("something happened");        
        }
      });
    } else {
      // show an error msg about not leaving blank the textarea
    }
  }
};

app.init();
