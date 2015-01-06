import os
from datetime import datetime
from flask import Flask, request, render_template, redirect, url_for, Blueprint
# from jinja2 import Environment
import jinja2
import json
import arrow 
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter
from app.utils import gen_new_id
from app.database import pastes

mod = Blueprint('paste', __name__)

# Custom filters

# This function fixes the naming of the languages
def lang_abbr(value):
    """Return "JavaScript" if `value` is "javascript" \
            and "HTML" if value is "Html" """
    lang = value.capitalize()
    if lang == "Javascript":
        lang = "JavaScript"
    elif lang == "Html":
        lang = "HTML"
    elif lang == "Css":
        lang = "CSS"
    elif lang == "Php":
         lang = "PHP"
    return lang


def datetimeformat(value):
    past = arrow.get(value)
    return past.humanize() 

# jinja_env = Environment()
# jinja_env.filters['datetimeformat'] = datetimeformat
jinja2.filters.FILTERS['datetimeformat'] = datetimeformat
jinja2.filters.FILTERS['lang_abbr'] = lang_abbr 

@mod.route('/paste/save', methods=['POST'])
def save_paste():
    if request.method == 'POST':
        _id = gen_new_id(pastes)
        code = request.form['code']
        lang = request.form['lang']
        theme = request.form['theme']
        created_at = datetime.utcnow()
        pastes.insert({'_id':_id, 'code':code, 'lang':lang, 'theme':theme, \
                'created_at':created_at })
        return json.dumps({'status': 'success', '_id': _id})
    else:
        return json.dumps({'error': 'Invalid request'})


@mod.route('/paste/<id>')
def show_paste(id=id):
    paste = pastes.find_one({'_id':id})
    lexer = get_lexer_by_name(paste['lang'], stripall=True)
    code_result = highlight(paste['code'], lexer, \
            HtmlFormatter(linenos=True))
    code_raw = paste['code'] 
    theme_file = 'css/' + paste['theme'] + '.css'
    print theme_file
    return render_template('paste.html', code=code_result, \
            code_raw=code_raw.strip(), id=id, theme_file=theme_file, \
            lang=paste['lang'])


@mod.route('/pastes')
def show_all():
    latest_pastes = pastes.find({}).limit(25).sort('created_at', -1)
    return render_template('latest-pastes.html', all=latest_pastes) 
