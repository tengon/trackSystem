FROM node:20-alpine AS runner
WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
COPY prisma ./prisma/

RUN npm install
RUN ./node_modules/.bin/prisma generate

COPY . .

ENV DATABASE_URL="postgresql://postgres:postgres@postgres:5432/tracker?schema=public"
ENV TELTONIKA_TCP_PORT=5027
ENV PORT=3002

EXPOSE 5027
EXPOSE 3002

CMD ["./node_modules/.bin/tsx", "index.ts"]
