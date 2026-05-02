from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

try:
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print("[DB] MongoDB connected successfully")
except ConnectionFailure as e:
    print(f"[DB ERROR] MongoDB connection failed: {e}")
    client = None

db = client["quizverse_ai"] if client else None
collection = db["quiz_results"] if db is not None else None
