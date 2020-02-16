FROM node:12

ENV NODE_ENV=production

WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm install

COPY . /app

CMD ["node", "app.js", "--production", "--apiurl", "https://api.snaps.dropud.nu/"]
