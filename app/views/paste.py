import os
from flask import Flask, request, render_template, redirect, url_for, Blueprint
import json
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter
from app.views.paste import pastes
from app.utils import utils

mod = Blueprint('paste', __name__)

# {
#     '_id': _id, 
#     'code':code, 
#     'lang':lang, 
#     'theme':theme, 
#     'created_at':created_at
# }

@mod.route('/paste/save', methods=['POST'])
def save_paste():
    error = None
    print request
    if request.method == 'POST':
        _id = get_new_id(pastes)
        code = request.form['code']
        lang = request.form['lang']
        theme = request.form['theme']
        created_at = datetime.utcnow()
        pastes.insert({'_id':_id, 'code':code, 'lang':lang, 'theme':theme, 'crated_at':created_at })
        return json.dumps({'status': 'success', '_id': _id})
    else:
        return json.dumps({'error': 'Invalid request'})


@mod.route('/paste/<id>')
def show_paste(id=id):
    code = pastes.find_one({'_id': id})['code']
    lang = pastes.find_one({'_id': id})['lang']
    theme = pastes.find_one({'_id': id})['theme']
    lexer = get_lexer_by_name(lang, stripall=True)
    code_result = highlight(code, lexer, HtmlFormatter(linenos=True))
    code_raw = code
    theme_file = 'css/' + theme + '.css'
    return render_template('code.html', code=code_result, code_raw=code_raw, id=id, theme_file=theme_file)


@mod.route('/paste/all')
def show_all():
    all_entries = pastes.find()
    return render_template('all.html', all=all_entries) 
