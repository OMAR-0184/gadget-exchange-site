from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Gadget Marketplace"
    API_V1_STR: str = "/v1"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Async Postgres connection string
    # e.g., postgresql+asyncpg://user:password@localhost/dbname
    DATABASE_URL: str
    REDIS_URL: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
