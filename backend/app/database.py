import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

# Attempt to build async engine
db_url = settings.DATABASE_URL

# Normalize URL for async drivers
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("sqlite:///"):
    db_url = db_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)

try:
    engine = create_async_engine(
        db_url,
        echo=False,
        future=True,
        connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
    )
except Exception as e:
    logger.warning(f"Failed to create primary database engine ({db_url}): {e}. Falling back to SQLite.")
    fallback_url = f"sqlite+aiosqlite:///{settings.BASE_DIR / 'triage.db'}"
    engine = create_async_engine(fallback_url, echo=False, future=True, connect_args={"check_same_thread": False})

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        # Import models so tables are registered
        from app import models  # noqa
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized successfully.")

