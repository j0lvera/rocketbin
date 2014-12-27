;(function($) {
  var s,
    d = document,
    editor = ace.edit("editor"),

  app = {
    settings: {
      // Defaults
      lang: localStorage.getItem("rocketbin-language") || "html",
      // theme: localStorage.getItem("rocketbin-theme") || "github",
      theme: "github",
      keybinding: localStorage.getItem("rocketbin-keybinding") || "keybinding",
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
      app.saveSetting("rocketbin-keybinding", keybinding);
    },

    setDefaultOptions: function() {
      ace.require("ace/ext/language_tools"); 
      ace.require("ace/ext/emmet"); 

      // http://stackoverflow.com/questions/22262136/ace-editor-with-vim-mode-and-emmet-enabled
      editor.setOption("EnableEmmet", true);

      // display saved options on UI
      s.optionKeybinding.value = localStorage.getItem("rocketbin-keybinding") || s.keybinding;
      s.optionLanguage.value = localStorage.getItem("rocketbin-language") || s.lang;

      this.setTheme(s.theme);
      this.setLang(s.lang);
      this.setKeybinding(s.keybinding);

      editor.setOptions({
        // wrap: true,
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
        behavioursEnabled: true
      });         
    },

    saveSetting: function(option, value) {
      localStorage.setItem(option, value); 
    },

    setLang: function(lang) {
      if (lang != "html") {
        editor.setOption("enableEmmet", false);
      } else {
        editor.setOption("enableEmmet", true);
      }

      editor.getSession().setMode("ace/mode/" + lang);
      app.editorFocus();
      app.saveSetting("rocketbin-language", lang);
    },

    setTheme: function(theme) {
      editor.setTheme("ace/theme/" + theme);
      app.editorFocus();
    },

    // http://stackoverflow.com/questions/7050931/how-to-set-focus-on-the-ace-editor
    editorFocus: function() {
      editor.focus();
      var lineNumber = editor.getSession().getValue().split("\n").length,
        session = editor.getSession(),
        count = session.getLength();
      editor.gotoLine(count, session.getLine(count - 1).length);
    },

    changeKeybinding: function() {
      value = this.value;
      s.keybinding = value;
      app.setKeybinding(value);
      app.editorFocus();
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
      app.editorFocus();
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
})(jQuery);
