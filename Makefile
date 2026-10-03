.PHONY: dev build test typecheck clean install

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

test:
	npm test

typecheck:
	npx tsc --noEmit

clean:
	rm -rf node_modules dist .next .turbo
