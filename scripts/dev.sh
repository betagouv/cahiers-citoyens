#!/bin/sh
# `bun dev` : même port que cahiers-verify dans cet arbre (3000 ou port de worktree).
REPO="$(cd "$(dirname "$0")/.." && pwd)"
. "$REPO/scripts/dev-port.sh"
exec next dev --port "${PORT:-$(dev_port "$REPO")}"
