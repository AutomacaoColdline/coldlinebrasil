FROM postgres:16-alpine
WORKDIR /usr/share/nginx/html
RUN apk add --no-cache nginx
RUN rm -f /etc/nginx/http.d/default.conf
COPY dist ./
COPY nginx.conf /etc/nginx/http.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
