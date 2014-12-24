from flask import Flask, render_template, Blueprint

mod = Blueprint('home', __name__)

# Routes
@mod.route('/')
def index():
    return render_template('index.html')
