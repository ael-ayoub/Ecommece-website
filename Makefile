.DEFAULT_GOAL := all

.PHONY: all seed clean fclean start dev dev-down

# Build and start the full containerized stack (Postgres + the app). The
# app image runs `prisma migrate deploy` on startup before serving, so a
# fresh checkout is fully self-contained — this is the only thing plain
# `make` does.
all:
	docker compose up -d --build

start:
	docker compose restart -d

# Dev mode: same Postgres container, but the app runs `next dev` against
# your bind-mounted source (docker-compose.dev.yml) instead of a pre-built
# image — edits on the host show up immediately, no rebuild needed. Use
# plain `make`/`make fclean` for the production-style stack instead.
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

dev-down:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Populate the database with sample data, run inside the running app
# container (admin login comes from ADMIN_EMAIL/ADMIN_PASSWORD in
# .env.local — see .env.example).
seed:
	docker compose exec app npm run prisma:seed

# Stop and remove the containers. Keeps the database volume (your data).
clean:
	docker compose down

# Full clean — also removes the database volume, built images, and local
# build artifacts, back to a fresh checkout.
fclean: clean
	docker compose down -v --rmi local
	rm -rf node_modules .next
