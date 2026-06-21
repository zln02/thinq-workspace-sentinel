# venv(.venv) 런타임과 동일한 3.12 로 정렬(이전 3.11 불일치 해소)
FROM python:3.12-slim

WORKDIR /app

# 핀 고정된 requirements.txt 사용 — 재현 가능 빌드(redis 무단 드리프트 방지)
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY backend /app/backend
COPY pipeline /app/pipeline

ENV PYTHONPATH=/app

EXPOSE 8003

# PORT 는 호스트(Koyeb/Render 등)가 주입 — 미설정 시 8003 (로컬/도커 호환).
# shell 형식 CMD 라야 ${PORT} 변수 치환이 동작한다.
CMD uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT:-8003}
