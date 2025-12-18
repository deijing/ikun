FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制代码
COPY . .

# 开发模式运行
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
