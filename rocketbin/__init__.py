import os
from bottle import (Bottle, jinja2_template as template, TEMPLATE_PATH,
                    abort, static_file, request, response, redirect)
from bottle.ext import sqlalchemy
from sqlalchemy import create_engine, Column, Integer, Sequence, String
from sqlalchemy.ext.declarative import declarative_base
from config import PROJECT_NAME

Base = declarative_base()
engine = create_engine('sqlite:///db.sqlite', echo=True)

app = Bottle()

plugin = sqlalchemy.Plugin(
    engine,
    Base.metadata,
    keyword='db',
    create=True,
    commit=True
)

app.install(plugin)

PROJECT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_PATH.insert(0, '{0}/templates'.format(PROJECT_PATH))


# Static files
@app.route('/static/<filename:path>')
def static_files(filename):
    return static_file(filename, root='./{0}/static/'.format(PROJECT_NAME))


@app.route('/')
def index():
    return template('create-new.html')


@app.post('/save')
def save_paste():
    title = request.forms.get('title')
    is_private = request.forms.get('private')
    keybinding = request.forms.get('keybinding')
    syntax = request.forms.get('syntax')
    print(request.forms.get('keybinding'))
