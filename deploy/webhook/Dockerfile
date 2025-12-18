FROM python:3.11-slim

WORKDIR /webhook

# 安装依赖
RUN pip install --no-cache-dir flask gunicorn

# 安装 docker cli 和 compose 插件（用于执行部署命令）
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ca-certificates \
    gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# 复制应用
COPY app.py .
COPY deploy.sh .
RUN chmod +x deploy.sh

# 创建日志目录
RUN mkdir -p /webhook/logs

EXPOSE 9000

CMD ["gunicorn", "--bind", "0.0.0.0:9000", "--workers", "1", "--timeout", "120", "app:app"]
