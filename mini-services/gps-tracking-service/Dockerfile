FROM oven/bun:1-alpine AS runner
WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install
RUN bunx prisma generate

COPY . .

ENV DATABASE_URL="postgresql://postgres:postgres@postgres:5432/tracker?schema=public"
ENV PORT=3001

EXPOSE 3001

CMD ["bun", "index.ts"]
