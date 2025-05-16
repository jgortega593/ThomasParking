# =========================
# Etapa 1: Construcción (build) de la aplicación React
# =========================
FROM node:18-alpine AS builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de dependencias
COPY package*.json ./

# Instala las dependencias
RUN npm ci

# Copia el resto del código fuente
COPY . .

# Construye la aplicación para producción
RUN npm run build

# =========================
# Etapa 2: Servidor web (Nginx) para producción
# =========================
FROM nginx:alpine

# Copia los archivos estáticos generados al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración para Single Page Application (React Router)
# Crea este archivo nginx.conf junto al Dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
