from sqlalchemy import create_engine, Column, Integer, Sequence, String
from sqlalchemy.ext.declarative import declarative_base
from rocketbin import Base


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer)
