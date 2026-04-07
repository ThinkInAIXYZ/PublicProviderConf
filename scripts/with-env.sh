#!/usr/bin/env sh

set -eu

print_usage() {
  echo "Usage: $0 [env-file] -- <command> [args...]" >&2
  echo "Example: $0 .env.local -- pnpm exec ts-node src/cli.ts fetch-providers -p doubao -o dist" >&2
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  print_usage
  exit 0
fi

env_file=".env.local"

if [ "${1:-}" != "" ] && [ "${1:-}" != "--" ]; then
  env_file="$1"
  shift
fi

if [ "${1:-}" = "--" ]; then
  shift
fi

if [ "$#" -eq 0 ]; then
  print_usage
  exit 1
fi

if [ ! -f "$env_file" ]; then
  echo "Env file not found: $env_file" >&2
  echo "Edit .env.local with your credentials first, or pass a different file path." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$env_file"
set +a

exec "$@"
