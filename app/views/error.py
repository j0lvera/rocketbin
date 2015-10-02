from flask import render_template, Blueprint

mod = Blueprint('error', __name__)

@mod.route('/500/', methods=['GET'])
def error_500():
    return render_template('500.html'), 500
