import os
from app import app
from pymongo import MongoClient 

db_client = MongoClient(
        app.config['MONGODB_HOSTNAME'], 
        app.config['MONGODB_PORT']
)

db = db_client[app.config['MONGODB_NAME']]

if app.config['MONGODB_USERNAME']:
    db.authenticate(
            app.config['MONGODB_USERNAME'], 
            app.config['MONGODB_PASSWORD']
    )

pastes = db.pastes

# {
#     '_id': _id, 
#     'author_id': author_id,
#     'code': code, 
#     'lang': lang, 
#     'theme': theme, 
#     'created_at':created_at
# }
