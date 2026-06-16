FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi==0.111.0 \
    "uvicorn[standard]==0.30.0" \
    asyncpg==0.29.0 \
    "redis>=5.0" \
    pydantic==2.7.0 \
    cowayaio==0.2.4

COPY backend /app/backend
COPY pipeline /app/pipeline

ENV PYTHONPATH=/app

EXPOSE 8003

# PORT 는 호스트(Koyeb/Render 등)가 주입 — 미설정 시 8003 (로컬/도커 호환).
# shell 형식 CMD 라야 ${PORT} 변수 치환이 동작한다.
CMD uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT:-8003}
