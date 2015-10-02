import os
from app import app, db
from app.models import Paste
from hashids import Hashids


SALT = app.config['SALT']
SUPPORTED_LANGUAGES = ['HTML', 'CSS', 'Sass', 'Less', 'JavaScript', 
                       'CoffeeScript', 'Python', 'Ruby', 'PHP', 
                       'Bash', 'sh']

def gen_new_id(num):
    hashids = Hashids(salt=SALT, min_length="6") 

    id = num + 1
    return hashids.encrypt(id)
