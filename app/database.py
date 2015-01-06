import os
from app import app
from pymongo import MongoClient 


DATABASE_HOST = os.getenv('MONGODB_HOST', app.config['MONGODB_HOSTNAME'])
DATABASE_NAME = os.getenv('MONGODB_DATABASE', app.config['MONGODB_NAME'])
DATABASE_PORT = int(os.getenv('MONGODB_PORT', app.config['MONGODB_PORT'])) 


db_client = MongoClient(DATABASE_HOST, DATABASE_PORT)
db = db_client[DATABASE_NAME]

if os.getenv('MONGODB_USERNAME'):
    db.authenticate(os.getenv('MONGODB_USERNAME'), os.getenv('MONGODB_PASSWORD'))

pastes = db.pastes

# {
#     '_id': _id, 
#     'author_id': author_id,
#     'code': code, 
#     'lang': lang, 
#     'theme': theme, 
#     'created_at':created_at
# }
