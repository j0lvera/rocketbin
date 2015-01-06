import os

SALT = os.getenv('SALT', '5Qz90Ucr90IrKNlokAXE2FunsZrFqYnTP1k9wxbyoLfnFRgvgKMY3f08Ra')
DEBUG=True
SECRET_KEY=os.getenv('SECRET_KEY', 'devkey')

MONGODB_HOSTNAME = os.getenv('MONGODB_HOST', 'localhost')
MONGODB_NAME = os.getenv('MONGODB_DATABASE', 'rocketbin-test-4')
MONGODB_PORT = int(os.getenv('MONGODB_PORT', 27017))
MONGODB_USERNAME = os.getenv('MONGODB_USERNAME', '')
MONGODB_PASSWORD = os.getenv('MONGODB_PASSWORD', '')

del os
