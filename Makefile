.PHONY: up down build restart logs ps clean fclean \
        backend-logs frontend-logs \
        sh-backend sh-frontend \
        db-shell redis-cli \
        prisma-seed prisma-studio

up:
	docker compose up -d

build:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker compose down -v

# Full teardown, scoped to this project only: stops + removes containers, networks,
# named volumes (postgres/redis/caddy data — all DB data is wiped), and every image
# built or pulled for this compose file. Does NOT touch other projects' Docker resources.
fclean:
	@echo "This will delete all containers, volumes (DB data), and images for this project."
	@read -p "Are you sure? [y/N] " ans; [ "$$ans" = "y" ] || [ "$$ans" = "Y" ] || (echo "Aborted."; exit 1)
	docker compose down -v --rmi all --remove-orphans

backend-logs:
	docker compose logs -f backend

frontend-logs:
	docker compose logs -f frontend

sh-backend:
	docker compose exec backend sh

sh-frontend:
	docker compose exec frontend sh

db-shell:
	docker compose exec postgres psql -U $${POSTGRES_USER:-ecommerce} -d $${POSTGRES_DB:-ecommerce}

redis-cli:
	docker compose exec redis redis-cli

# Both run against the host-published postgres port (127.0.0.1:5432), using backend/.env —
# not inside the container — so Prisma Studio's web UI is reachable directly at localhost:5555.
prisma-seed:
	cd backend && npm run db:seed

prisma-studio:
	cd backend && npx prisma studio --port 5555
