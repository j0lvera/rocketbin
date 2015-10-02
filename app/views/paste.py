import os
from datetime import datetime
from flask import Flask, request, render_template, redirect, url_for, Blueprint, \
        abort
import jinja2
import json
import arrow 
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter
from app import db
from app.utils import gen_new_id, SUPPORTED_LANGUAGES
from app.database import pastes
from app.models import Paste 

mod = Blueprint('paste', __name__)

def datetimeformat(value):
    past = arrow.get(value)
    return past.humanize() 

# jinja_env = Environment()
# jinja_env.filters['datetimeformat'] = datetimeformat
jinja2.filters.FILTERS['datetimeformat'] = datetimeformat

@mod.route('/paste/save', methods=['POST'])
def save_paste():
    if request.method == 'POST' and request.form['lang'] in SUPPORTED_LANGUAGES:
        if Paste.query.all():
            _id = gen_new_id(len(Paste.query.all()) + 1)
        else:
            _id = gen_new_id(1)

        # pastes.insert({
        #     '_id': _id, 
        #     'code': request.form['code'],

        #     # In the front-end 'Bash' needs to be called 'sh' because Ace.js need it
        #     # that way, so we change it to 'Bash' here to avoid conflicts
        #     'lang': 'Bash' if request.form['lang'] == 'sh' else request.form['lang'],
        #     'theme': request.form['theme'], 
        #     'title': request.form['title'], 
        #     'private': request.form['private'], 
        #     'created_at': datetime.utcnow()
        # })


        # _id, title, private, code, lang, theme, created_at

        # SQLAlchemy
        paste = Paste(_id, request.form['title'], request.form['private'], 
                request.form['code'], request.form['lang'], 'github', 
                datetime.utcnow())

        db.session.add(paste)
        db.session.commit()

        return json.dumps({'status': 'success', '_id': _id})
    else:
        abort(403)

@mod.route('/paste/<id>')
def show_paste(id=id):
    # MongoDB
    # paste = pastes.find_one({'_id':id})

    # SQLAlchemy
    # paste = Paste.filter(_id==id).first()
    paste = Paste.query.filter_by(_id=id).first()

    # If title is not set, use `id` instead
    # title = id if not 'title' in paste else paste.title
    title = paste.title

    lexer = get_lexer_by_name(paste.lang, stripall=True)
    code_result = highlight(paste.code, lexer, HtmlFormatter(linenos=True))
    return render_template('paste.html', code=code_result, code_raw=paste.code, 
            id=id, lang=paste.lang, created_at=paste.created_at, title=title,
            created_by=paste.created_by)

@mod.route('/pastes')
def show_all():
    ## TODO: Fix to show in `False` instead of `"false"`
    latest_pastes = Paste.query.filter(Paste.private=='false')\
            .order_by(Paste.id.desc()).limit(25)

    # MongoDB
    # latest_pastes = pastes.find({'private': 'false'}).limit(25).sort('created_at', -1)
    return render_template('latest-pastes.html', all=latest_pastes) 
