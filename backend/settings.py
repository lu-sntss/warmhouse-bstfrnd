from dotenv import load_dotenv
import os

load_dotenv()

TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "")
TURSO_AUTH_TOKEN   = os.getenv("TURSO_AUTH_TOKEN", "")
ALLOWED_ORIGINS = ["https://warmhouse-bstfrnd-front-end.onrender.com"]
