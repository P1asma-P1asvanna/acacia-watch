FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend
COPY frontend frontend
ENV PORT=8080 DD_DB=/data/acacia_watch.sqlite3 DD_TRUST_PROXY=1 DD_COOKIE_SECURE=1
VOLUME /data
EXPOSE 8080
CMD ["python", "backend/server.py"]
