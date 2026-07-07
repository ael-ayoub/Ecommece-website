.PHONY: up down build restart logs ps clean \
        backend-logs frontend-logs \
        sh-backend sh-frontend \
        db-shell redis-cli

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
