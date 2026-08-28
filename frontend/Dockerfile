# Этап сборки
FROM node:18-alpine AS build

WORKDIR /app

# Копируем package.json
COPY package.json ./
COPY package-lock.json* ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходники
COPY . .

# Собираем
RUN npm run build

# Этап production
FROM nginx:alpine

# Копируем собранные файлы
COPY --from=build /app/build /usr/share/nginx/html

# Копируем конфиг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]