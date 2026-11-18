#!/usr/bin/env bash
set -euo pipefail

if [[ $# != 1 ]]; then
  echo "Usage: bash $0 <new-output-directory>" >&2
  exit 2
fi

root=$(cd -- "$(dirname -- "$0")/.." && pwd -P)
base=7d7ddee0d05ddaf99a2adfc6e377434d21d60fbd
patch="$root/scripts/library-v4-rollback.patch"

git -C "$root" cat-file -e "$base^{commit}"
mkdir -- "$1"
out=$(cd -- "$1" && pwd -P)
git -C "$root" archive "$base" | tar -x -C "$out"
# Ignore any enclosing checkout if the output directory is inside the repo.
GIT_CEILING_DIRECTORIES="$(dirname -- "$out")" git -C "$out" apply --no-index "$patch"
printf 'Rollback source ready in %s\n' "$out"
