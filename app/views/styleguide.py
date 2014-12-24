import os
from flask import Flask, render_template, Blueprint

mod = Blueprint('styleguide', __name__)

@mod.route('/style-guide')
def show_style_guide():
    return render_template('style-guide.html')
