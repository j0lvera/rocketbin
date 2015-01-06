import os
from app import app
from hashids import Hashids


SALT = app.config['SALT']

def gen_new_id(model):
    if model.find({}):
        hashids = Hashids(salt=SALT, min_length="6") 
        id = model.find({}).count() + 1
        return hashids.encrypt(id)
    else:
        raise "Model doesn\'n exist"
