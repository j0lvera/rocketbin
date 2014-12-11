var s,
  d = document,
  editor = ace.edit("editor"),

app = {
  settings: {
    // Defaults
    lang: "javascript",
    theme: "monokai",
    // UI
    optionLanguage: d.getElementById('language'),
    optionTheme: d.getElementById('theme'),
    form: d.getElementById('form-save-code'),
    btnDelete: $('.btnDelete') 
  },

  init: function() {
    s = this.settings;       

    // start app
    this.setTheme(s.theme);
    this.setLang(s.lang);

    this.bindUI();
  },

  bindUI: function() {
    s.optionLanguage.addEventListener('change', app.changeLang);
    s.optionTheme.addEventListener('change', app.changeTheme);
    s.form.addEventListener('submit', app.saveCode);
  },

  setLang: function(lang) {
    editor.getSession().setMode("ace/mode/" + lang);
  },

  setTheme: function(theme) {
    editor.setTheme("ace/theme/" + theme);
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
