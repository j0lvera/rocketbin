import os

DEBUG=True
SECRET_KEY=os.getenv('SECRET_KEY', 'dviZHHkBr35GGoTQXt9064Mto467Ofj1MdkjIPU8PmZ70UeYATaTh_1UpEQC')

MONGODB_HOSTNAME = 'localhost'
MONGODB_NAME = 'rocketbin-test-4'
MONGODB_PORT = 27017

del os
