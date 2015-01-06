(function($) {
  var $textarea = $('.code-raw-textarea'),
    code = $textarea.val(),
    editorHeight = $('.code-result').height();

  $textarea
    // removing whitespace because I couldn't figure out how to do it in Python
    .val(code.trim())
    // setting same height as the no-raw area
    .css({height: editorHeight + 15});
})(jQuery);
