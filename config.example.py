import os

DEBUG=False
SECRET_KEY=os.getenv('SECRET_KEY', '<your secret key here>')

MONGODB_HOSTNAME = 'localhost'
MONGODB_NAME = '<your database name here>'
MONGODB_PORT = 27017

del os
