.PHONY: build-server build-frontend start stop restart clean

build-server:
	cd server && npm install && npx tsc

build-frontend:
	cd frontend && npm install && npx vite build

build: build-server build-frontend

start:
	docker compose up -d

stop:
	docker compose down

restart: stop start

dev-frontend:
	cd frontend && npx vite

clean:
	docker compose down -v
	rm -rf server/build server/node_modules frontend/dist frontend/node_modules
