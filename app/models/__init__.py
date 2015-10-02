from app import db

# class User(db.Model):
#     _id = db.Column(db.String, unique=True)
#     username = db.Column(db.String, unique=True)
#     email_address = db.Column(db.String, unique=True)

#     def __init__(self, _id, username, email_address):
#         self._id = _id
#         self.username = username
#         self.email_address = email_address

#     def __repr__(self):
#         return '<User %d>' % self._id

class Paste(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    _id = db.Column(db.String)
    title = db.Column(db.String)
    private = db.Column(db.String)
    code = db.Column(db.String)
    lang = db.Column(db.String)
    created_at = db.Column(db.Date)
    edited_at = db.Column(db.Date)

    def __init__(self, _id, title, private, code, lang, theme, created_at):
        self._id = _id
        # If no title, set the id as title
        self.title = _id if not title else title 
        self.private = private
        self.code = code
        self.lang = lang
        self.created_at = created_at
        self.edited_at = created_at 

    def __repr__(self):
        return '<Paste %s>' % self._id
