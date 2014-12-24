import os
from datetime import datetime
from bson import ObjectId
from bson.json_util import dumps
import pymongo
from pymongo import Connection

# Mongo Setup
DATABASE_HOST = os.getenv('MONGODB_HOST', 'localhost')
DATABASE_NAME = os.getenv('MONGODB_DATABASE', 'rocketbin-test-4')
DATABASE_PORT = int(os.getenv('MONGODB_PORT', 27017)) 

# DATABASE_HOST = os.getenv('MONGODB_HOST')
# DATABASE_NAME = os.getenv('MONGODB_DATABASE')
# DATABASE_PORT = int(os.getenv('MONGODB_PORT', 27017)) 

connection = Connection(DATABASE_HOST, DATABASE_PORT)
db = connection[DATABASE_NAME]
# db.authenticate(os.getenv('MONGODB_USERNAME'), os.getenv('MONGODB_PASSWORD'))

pastes = db.pastes

# {
#     '_id': _id, 
#     'code':code, 
#     'lang':lang, 
#     'theme':theme, 
#     'created_at':created_at
# }
