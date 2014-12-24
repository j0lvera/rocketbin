from hashids import Hashids
from passlib.hash import pbkdf2_sha256, md5_crypt

# Methods 
def get_new_id(model):
    if model.find({}):
        hashids = Hashids(salt=SALT, min_length="6") 
        id = model.find({}).count() + 1
        return hashids.encrypt(id)
    else:
        raise "Model doesn\'n exist"
