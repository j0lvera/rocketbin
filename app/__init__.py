from flask import Flask, g, render_template, abort

app = Flask(__name__, instance_relative_config=True)
app.config.from_object('config')
app.config.from_pyfile('config.py')


@app.errorhandler(403)
def forbidden_page(error):
    return render_template('403.html'), 403

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error_page(error):
    return render_template('500.html'), 500

from app.views import home
from app.views import paste
from app.views import styleguide

app.register_blueprint(home.mod)
app.register_blueprint(paste.mod)
app.register_blueprint(styleguide.mod)
