;(function($) {
  var s,
    d = document,
    editor = ace.edit("editor"),

  app = {
    settings: {
      // Defaults
      title: '',
      lang: localStorage.getItem("rocketbin-language") || "html",
      theme: "github",
      keybinding: localStorage.getItem("rocketbin-keybinding") || "keybinding",
      private: '',
      // UI
      optionLanguage: d.getElementById('language'),
      optionTheme: d.getElementById('theme'),
      optionKeybinding: d.getElementById('keybinding'),
      form: d.getElementsByClassName('editor-form')[0],
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
        wrap: true,
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

      editor.getSession().setMode("ace/mode/" + lang.toLowerCase());
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
      var value = this.value;
      s.keybinding = value;
      app.setKeybinding(value);
      app.editorFocus();
    },

    changeLang: function() {
      var value = this.value;
      s.lang = value;
      app.setLang(value);
    },

    changeTheme: function() {
      var value = this.value;
      s.theme = value;
      app.setTheme(value);
      app.editorFocus();
    },

    saveCode: function(e) {
      e.preventDefault();
      var code = editor.getValue();

      // Fixes
      s.title = document.getElementById('title').value;
      s.private = document.getElementById('private').checked;

      // Ace.js uses Coffee instead of CoffeeScript , so we fix it here
      // to make the server be able to read it correctly.
      if (s.lang == 'Coffee') {
        s.lang = 'CoffeeScript';
      }

      console.log(s.title);
      console.log(s.private);

      if (code != '') {
        $.ajax({
          url: '/paste/save',
          data: {
            code: code,
            lang: s.lang,
            theme: s.theme,
            // Make sure that the title is less than 60 chars
            title: s.title.substring(0, 100),
            private: s.private 
          },
          type: 'POST',
          success: function(data) {
            var status = $.parseJSON(data);

            if (status._id) {
              location.href = location.href + 'paste/' + status._id;
            }
          },
          error: function(xhr, textStatus) {
            /*
             * Need to get the error msg from the server to send it back
             * and render the correct 500.html template
             */

            if (xhr.status === 500) {
              location.href = location.href + '500/';
            }
          }
        });
      } else {
        // show an error msg about not leaving blank the textarea
      }
    }
  };

  app.init();
})(jQuery);
