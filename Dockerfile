FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ARG VITE_TURN_USERNAME
ARG VITE_TURN_CREDENTIAL
ENV VITE_TURN_USERNAME=$VITE_TURN_USERNAME
ENV VITE_TURN_CREDENTIAL=$VITE_TURN_CREDENTIAL
RUN npm run build

FROM node:20-alpine AS server-build
WORKDIR /app/Server
COPY Server/package*.json ./
RUN npm ci --omit.dev
COPY Server/ ./


FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=server-build /app/Server ./Server
COPY --from=client-build /app/client/dist ./client/dist

WORKDIR /app/Server
EXPOSE 3001
USER node
CMD ["node","index.js"]