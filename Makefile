.PHONY: build-server build-frontend start stop restart clean setup-server-types

setup-server-types:
	mkdir -p server/node_modules/nakama-runtime
	cd server && npm install
	@if [ ! -f server/node_modules/nakama-runtime/index.d.ts ]; then \
		echo "Downloading Nakama runtime types..."; \
		curl -sL https://raw.githubusercontent.com/heroiclabs/nakama-common/master/index.d.ts \
			-o server/node_modules/nakama-runtime/index.d.ts; \
		echo '{"name":"nakama-runtime","version":"1.45.0","typings":"./index.d.ts"}' \
			> server/node_modules/nakama-runtime/package.json; \
	fi

build-server: setup-server-types
	cd server && npx tsc

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
