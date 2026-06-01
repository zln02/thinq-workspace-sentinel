FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi==0.111.0 \
    "uvicorn[standard]==0.30.0" \
    asyncpg==0.29.0 \
    "redis>=5.0" \
    pydantic==2.7.0

COPY backend /app/backend
COPY pipeline /app/pipeline

ENV PYTHONPATH=/app

EXPOSE 8003

CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8003"]
