FROM node:12

ENV NODE_ENV=production

WORKDIR /app
COPY . /app

RUN npm install

CMD ["node", "app.js", "--apiurl", "http://api.snaps.dropud.nu:8000/"]
