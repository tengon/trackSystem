FROM node:20-alpine AS runner
WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

ENV DATABASE_URL="postgresql://postgres:postgres@postgres:5432/tracker?schema=public"
ENV PORT=3001

EXPOSE 3001

CMD ["npx", "tsx", "index.ts"]
