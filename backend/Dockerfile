FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip

# 1. Сначала torch CPU-only (отдельно, чтобы не тянул CUDA)
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch==2.6.0

# 2. Потом остальные зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/data && chmod +x /app/entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health || exit 1

CMD ["sh", "./entrypoint.sh"]