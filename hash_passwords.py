from passlib.hash import pbkdf2_sha256, md5_crypt

def hash_pass(password):
    return pbkdf2_sha256.encrypt(password, rounds=8000, salt_size=16)

def check_pass(username, password):
    password_hashed = users.find_one({'username': username})['password']
    return pbkdf2_sha256.verify(password, password_hashed)
