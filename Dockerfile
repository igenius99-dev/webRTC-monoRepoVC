FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY Server/package*.json ./Server/
RUN cd Server && npm ci --omit=dev
COPY Server/ ./Server/
COPY --from=client-build /app/client/dist ./client/dist
EXPOSE 10000
CMD ["node", "Server/index.js"]
