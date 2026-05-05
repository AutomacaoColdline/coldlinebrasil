FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_USER_TYPE_ADMIN=67c70b87051a26b141f61ab7
ARG VITE_USER_TYPE_SETUP=67c70b87051a26b141f61ab7
ARG VITE_USER_TYPE_INDUSTRIA=67f41bf13a50bfa4e95bfe69
ENV VITE_USER_TYPE_ADMIN=$VITE_USER_TYPE_ADMIN
ENV VITE_USER_TYPE_SETUP=$VITE_USER_TYPE_SETUP
ENV VITE_USER_TYPE_INDUSTRIA=$VITE_USER_TYPE_INDUSTRIA
RUN npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -f /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
