from hashids import Hashids

SALT = '5Qz90Ucr90IrKNlokAXE2FunsZrFqYnTP1k9wxbyoLfnFRgvgKMY3f08Ra'

# Methods 
def gen_new_id(model):
    if model.find({}):
        hashids = Hashids(salt=SALT, min_length="6") 
        id = model.find({}).count() + 1
        return hashids.encrypt(id)
    else:
        raise "Model doesn\'n exist"
