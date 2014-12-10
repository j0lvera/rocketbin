from flask import Flask, request, render_template, redirect, url_for
from hashids import Hashids
import json
# import jinja2_highlight
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter

app = Flask(__name__)

SALT = 'iyVnWkuwcGUXq9vggQtY'

# Mongo Setup
from bson import ObjectId
from bson.json_util import dumps

DATABASE_HOST = 'localhost'
DATABASE_NAME = 'frontbin'
DATABASE_PORT = 27017

import pymongo
from pymongo import Connection

connection = Connection(DATABASE_HOST, DATABASE_PORT)
db = connection[DATABASE_NAME]
users = db.users
pastes = db.pastes

# Methods 

def get_new_id():
    hashids = Hashids(salt=SALT, min_length="16") 
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
        pastes.insert({'_id': _id, 'code': code, 'lang': lang })
        # return redirect('/paste/' + _id, 301)
        # return redirect(url_for('show_all'))
        return json.dumps({'status': 'success', '_id': _id})
    else:
        return json.dumps({'error': 'Invalid request'})

@app.route('/paste/<id>')
def show_paste(id=id):
    code = pastes.find_one({'_id': id})['code']
    lang = pastes.find_one({'_id': id})['lang']
    lexer = get_lexer_by_name(lang, stripall=True)
    code_result = highlight(code, lexer, HtmlFormatter(linenos=True))
    print code_result
    return render_template('code.html', code=code_result, id=id)

# @app.route('/paste/<id>/edit')
# def edit_paste(id=id):
#     return None

@app.route('/paste/all')
def show_all():
    print pastes.find()
    return dumps(pastes.find(), indent=2) 

if __name__ == '__main__':
    app.run(debug=True)
