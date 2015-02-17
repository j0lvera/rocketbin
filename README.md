Rocketbin v0.1.4
========

Rocketbin is a very easy to use [Pastebin](http://pastebin.com/) clone.

You can share code snippets right away, just write code, submit and share the link.

Supported languages:

- HTML
- CSS
- Sass
- Less
- JavaScript
- CoffeeScript
- Python
- Ruby
- PHP

Rocketbin is powered by [Flask](http://flask.pocoo.org/), [MongoDB](http://www.mongodb.org/), [Sass](http://sass-lang.com/), [jQuery](http://jquery.com/), &amp; [Ace](http://ace.c9.io/). 

Installation
------------

Prerequisites:
- Python 2.7 or Python 3.3
- [pip](https://pip.pypa.io/en/latest/installing.html)
- [virtualenv](https://virtualenv.pypa.io/en/latest/)
- [MongoDB](http://www.mongodb.org/) server running

```bash
# First you need to clone the project
$ git clone https://github.com/thinkxl/rocketbin.git
$ cd rocketbin
# Create a virtual enviroment
$ virtualenv venv
# Activate the enviroment
$ . venv/bin/activate
# Install all dependencies with pip
$ pip install -r requirements.txt
# Rename `config.example.py` to `config.py`
$ mv config.example.py config.py
# Edit settings inside `config.py` file with your favorite editor
$ nano config.py
```

After `nano config.py` you will see something like this:

```python
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
```

And then you will have to enter your own settings like this example:

```python
import os

DEBUG=True
SECRET_KEY=os.getenv('SECRET_KEY', 'development-key')
SALT=os.getenv('SALT', 'development-salt')

MONGODB_HOSTNAME = os.getenv('MONGODB_HOST', 'localhost')
MONGODB_NAME = os.getenv('MONGODB_DATABASE', 'rocketbin-test')
MONGODB_PORT = int(os.getenv('MONGODB_PORT', 27017))

# If you didn't specify username and password when starting the MongoDB server, then just leave these blank.
MONGODB_USERNAME = os.getenv('MONGODB_USERNAME', '')
MONGODB_PASSWORD = os.getenv('MONGODB_PASSWORD', '')

del os
```

**NOTE:** *In most cases when you are running the app in your computer (localhost) you won&rsquo;t need to enter `MONGODB_USERNAME` and `MONGODB_PASSWORD` so leaving them blank is ok.*

```bash
# After editing the `config.py` file run the server
$ python run.py
# Open the browser at http://127.0.0.1:4000
```

Support
-------

If you are having issues trying to install Rocketbin or have any question ping me via:

- **Email:** thinkxl (at) gmail.com
- **IRC:** `##frontend` or `#pocoo` in freenode
- **Twitter:** [@thinkxl](http://twitter.com/thinkxl)

FAQ
---

**Why another Pastebin clone?**

I just wanted to know how to make one, my goal is to learn Python and Flask, so I thought it was a good exercise. 

**Why MongoDB and not SQLite?**

Because I&rsquo;m learning MongoDB. 

License
-------

The project is licensed under the GPL v2 license.
