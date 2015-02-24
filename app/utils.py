import os
from app import app
from hashids import Hashids


SALT = app.config['SALT']
SUPPORTED_LANGUAGES = ['HTML', 'CSS', 'Sass', 'Less', 'JavaScript', 
                       'CoffeeScript', 'Python', 'Ruby', 'PHP', 
                       'Bash', 'sh']

def gen_new_id(model):
    if model.find({}):
        hashids = Hashids(salt=SALT, min_length="6") 
        id = model.find({}).count() + 1
        return hashids.encrypt(id)
    else:
        raise "Model doesn\'n exist"
