# You will need to rename this file to `config.py`
# example: `mv config.example.py config.py`

import os

DEBUG=True
SECRET_KEY=os.getenv('SECRET_KEY', '<your secret key here>')
SALT=os.getenv('SALT', '<your salt here>')

MONGODB_HOSTNAME = os.getenv('MONGODB_HOST', 'localhost')
MONGODB_NAME = os.getenv('MONGODB_DATABASE', '<your database name here>')
MONGODB_PORT = int(os.getenv('MONGODB_PORT', 27017))
MONGODB_USERNAME = os.getenv('MONGODB_USERNAME', '<your MongoDB username here>')
MONGODB_PASSWORD = os.getenv('MONGODB_PASSWORD', '<your MongoDB password here>')

del os
