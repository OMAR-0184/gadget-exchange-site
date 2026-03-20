from server.db.session import engine
from server.db.base import Base

def init_db():
    Base.metadata.create_all(bind=engine)