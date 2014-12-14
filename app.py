import os
from flask import Flask, request, render_template, redirect, url_for, get_flashed_messages, flash
from hashids import Hashids
import json
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter
from bson import ObjectId
from bson.json_util import dumps
import pymongo
from pymongo import Connection
from flask.ext.login import (LoginManager, UserMixin, AnonymousUserMixin,
        current_user, login_user,
        logout_user, user_logged_in, user_logged_out,
        user_loaded_from_cookie, user_login_confirmed,
        user_loaded_from_header, user_loaded_from_request,
        user_unauthorized, user_needs_refresh,
        make_next_param, login_url, login_fresh,
        login_required, session_protected,
        fresh_login_required, confirm_login,
        encode_cookie, decode_cookie, _secret_key, 
        _user_context_processor, user_accessed)
from flask_wtf import Form
from wtforms import StringField, TextField, PasswordField
from wtforms.validators import DataRequired
from passlib.hash import pbkdf2_sha256, md5_crypt

app = Flask(__name__)
app.config.from_pyfile('config.cfg')

SALT = 'iyVnWkUXq9vggQi'

# Mongo Setup
DATABASE_HOST = os.getenv('MONGODB_HOST', 'localhost')
DATABASE_NAME = os.getenv('MONGODB_DATABASE', 'rocketbin')
DATABASE_PORT = int(os.getenv('MONGODB_PORT', 27017)) 

connection = Connection(DATABASE_HOST, DATABASE_PORT)
db = connection[DATABASE_NAME]
db.authenticate(os.getenv('MONGODB_USERNAME'), os.getenv('MONGODB_PASSWORD'))

users = db.users
pastes = db.pastes

# Classes
class User(UserMixin):
    def __init__(self, username, password):
        self.username = username
        self.password = password
        self.active = True

    def is_authenticated(self):
        return True

    def is_active(self):
        # Here you should write whatever the code is
        # that checks the database if your user is active
        return True 

    def is_anonymous(self):
        return False

    def get_id(self):
        user = users.find_one({'username':self.username})['_id']
        return unicode(str(user))

class LoginForm(Form):
    username = TextField('username', validators=[DataRequired()])
    password = PasswordField('password', validators=[DataRequired()])


class SignupForm(Form):
    username = TextField('username', validators=[DataRequired()])
    password = PasswordField('password', validators=[DataRequired()])

# Creating a login manager instance
login_manager = LoginManager()
# Configuring
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    # 1. Fetch against the database a user by `id` 
    user = users.find_one({'_id':user_id})
    # 2. Create a new object of `User` class and return it
    return User(user['username'], user['password'])

# Methods 
def pass_hash(password):
    return pbkdf2_sha256.encrypt(password, rounds=8000, salt_size=16)

def pass_check(username, password):
    password_hashed = users.find_one({'username': username})['password']
    return pbkdf2_sha256.verify(password, password_hashed)

def get_new_id(model):
    hashids = Hashids(salt=SALT, min_length="6") 
    id = model.find({}).count() + 1
    return hashids.encrypt(id)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if current_user.is_authenticated():
        return redirect(url_for('index'))
    elif request.method == 'POST' and 'username' in request.form:
        username = request.form['username']
        password = request.form['password']
        hashed_password = pass_hash(password)
        if form.validate_on_submit():
            if users.find_one({'username': username}):
                if pass_check(username, password):
                    # login and validate the user...
                    user = User(username, hashed_password)
                    if login_user(user):
                        flash('Logged in successfully.')
                        return redirect(request.args.get('next') or url_for('user_profile'))
                    else: 
                        flash('Sorry, but you could not log in')
                else:
                    flash('Wrong Password')
            else:
                flash('Username doesn\'t exist')
        else:
            flash('Please enter your username and password')
    return render_template('login.html', form=form)

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    form = SignupForm()
    if current_user.is_authenticated():
        return redirect(url_for('user_profile'))
    elif request.method == 'POST' and 'username' in request.form:
        if form.validate_on_submit():
            username = request.form['username']
            password = pass_hash(request.form['password'])
            if users.find_one({'username': username}):
                flash('Username already exist')
            else:
                _id = get_new_id(users)
                users.insert({'_id': _id, 'username':username, 'password':password})
                print users.find_one({'_id':_id})
                flash('User created successfully')
                return redirect(request.args.get('next') or url_for('user_profile'))
    return render_template('signup.html', form=form)

@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/paste/save', methods=['POST'])
def save_paste():
    error = None
    print request
    if request.method == 'POST':
        _id = get_new_id(pastes)
        code = request.form['code']
        lang = request.form['lang']
        theme = request.form['theme']
        if current_user.is_authenticated():
            user_id = current_user.get_id()
            pastes.insert({'_id': _id, 'code': code, 'lang': lang, 'theme': theme, 'user_id':user_id})
        else:
            pastes.insert({'_id': _id, 'code': code, 'lang': lang, 'theme': theme, 'user_id':'Anonymous' })
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
    all_entries = pastes.find()
    return render_template('all.html', all=all_entries) 

# User
@app.route('/user')
def user_profile():
    if current_user.is_authenticated():
        flash('Hello ' + current_user.username)
        user_id = current_user.get_id()
        user_pastes = pastes.find({'user_id': user_id})
        return render_template('user.html', user_pastes=user_pastes)
    else:
        return redirect(url_for('login'))

@app.route('/users/all')
def show_users():
    return users.find({})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
    # app.run(debug=True)
