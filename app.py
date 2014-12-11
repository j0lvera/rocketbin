import os
from flask import Flask, request, render_template, redirect, url_for
from hashids import Hashids
import json
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter

app = Flask(__name__)

SALT = 'iyVnWkuwcGUXq9vggQtYssS'

# Mongo Setup
from bson import ObjectId
from bson.json_util import dumps

# DATABASE_HOST = 'localhost'
# DATABASE_NAME = 'rocketbin'
# DATABASE_PORT = 27017

DATABASE_HOST = os.environ.get('MONGODB_HOST')
DATABASE_NAME = os.environ.get('MONGODB_DATABASE')
DATABASE_PORT = os.environ.get(int('MONGODB_PORT')) 

import pymongo
from pymongo import Connection

connection = Connection(DATABASE_HOST, DATABASE_PORT)
db = connection[DATABASE_NAME]
users = db.users
pastes = db.pastes

# Methods 

def get_new_id():
    hashids = Hashids(salt=SALT, min_length="6") 
    id = pastes.find({}).count() + 1
    return hashids.encrypt(id)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/paste/save', methods=['POST'])
def save_paste():
    error = None
    print request
    if request.method == 'POST':
        _id = get_new_id()
        code = request.form['code']
        lang = request.form['lang']
        theme = request.form['theme']
        pastes.insert({'_id': _id, 'code': code, 'lang': lang, 'theme': theme })
        # return redirect('/paste/' + _id, 301)
        # return redirect(url_for('show_all'))
        return json.dumps({'status': 'success', '_id': _id})
    else:
        return json.dumps({'error': 'Invalid request'})

@app.route('/paste/<id>')
def show_paste(id=id):
    code = pastes.find_one({'_id': id})['code']
    lang = pastes.find_one({'_id': id})['lang']
    theme = pastes.find_one({'_id': id})['theme']
    lexer = get_lexer_by_name(lang, stripall=True)
    code_result = highlight(code, lexer, HtmlFormatter(linenos=True))
    code_raw = code
    theme_file = 'css/' + theme + '.css'
    return render_template('code.html', code=code_result, code_raw=code_raw, id=id, theme_file=theme_file)

@app.route('/paste/all')
def show_all():
    # lexer = get_lexer_by_name('json', stripall=True)
    # all_entries = highlight(dumps(pastes.find()), lexer, HtmlFormatter(linenos=True))
    all_entries = pastes.find()
    return render_template('all.html', all=all_entries) 

@app.route('/paste/all/raw')
def show_raw():
    all_entries = pastes.find()
    return dumps(all_entries)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
