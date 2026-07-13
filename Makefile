.DEFAULT_GOAL := all

.PHONY: all seed clean fclean

# Build and start the full containerized stack (Postgres + the app). The
# app image runs `prisma migrate deploy` on startup before serving, so a
# fresh checkout is fully self-contained — this is the only thing plain
# `make` does.
all:
	docker compose up -d --build

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
