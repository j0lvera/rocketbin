import os
_basedir = os.path.abspath(os.path.dirname(__file__))
DEBUG=False
SECRET_KEY=os.getenv('SECRET_KEY', 'dviZHHkBr35GGoTQXt9064Mto467Ofj1MdkjIPU8PmZ70UeYATaTh_1UpEQC')
del os
