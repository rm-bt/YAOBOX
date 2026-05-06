from sqlalchemy import create_engine

engine = create_engine("postgresql://postgres:1234567890@127.0.0.1:5432/yaobox_db")

try:
    with engine.connect() as conn:
        print("CONNECTED SUCCESSFULLY")
except Exception as e:
        print("FAILED:", e)