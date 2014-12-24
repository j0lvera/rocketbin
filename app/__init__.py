from flask import Flask, g, render_template, abort

app = Flask(__name__)
app.config.from_object('appconfig')


@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404


from app.views import home
from app.views import paste
from app.views import styleguide

app.register_blueprint(home.mod)
app.register_blueprint(paste.mod)
app.register_blueprint(styleguide.mod)
