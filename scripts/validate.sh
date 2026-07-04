#!/usr/bin/env bash
# Structural lint for the superkit skills pack. Exit non-zero on any error.
set -u
cd "$(dirname "$0")/.."
errors=0
warns=0
err() { echo "ERROR: $1"; errors=$((errors+1)); }
warn() { echo "warn:  $1"; warns=$((warns+1)); }

[ -f .claude-plugin/plugin.json ] || err "missing .claude-plugin/plugin.json"
[ -f README.md ] || err "missing README.md"

for dir in skills/*/; do
  name=$(basename "$dir")
  f="$dir/SKILL.md"
  if [ ! -f "$f" ]; then err "$name: missing SKILL.md"; continue; fi

  # frontmatter block
  head -1 "$f" | grep -q '^---$' || { err "$name: no YAML frontmatter"; continue; }
  [ "$(grep -c '^---$' "$f")" -ge 2 ] || { err "$name: unterminated frontmatter"; continue; }
  fm=$(awk '/^---$/{c++; next} c==1{print} c>=2{exit}' "$f")

  fm_name=$(echo "$fm" | sed -n 's/^name:[[:space:]]*//p' | head -1)
  desc=$(echo "$fm" | sed -n 's/^description:[[:space:]]*//p' | head -1)

  [ -n "$fm_name" ] || err "$name: frontmatter missing 'name'"
  [ -n "$desc" ]    || err "$name: frontmatter missing 'description'"
  case "$desc" in '>'*|'|'*) err "$name: description must be a single-line scalar";; esac
  [ ${#desc} -ge 40 ] || err "$name: description suspiciously short (<40 chars)"
  [ "$fm_name" = "$name" ] || err "$name: frontmatter name '$fm_name' != dir name"
  echo "$name" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$' || err "$name: name not kebab-case"
  [ ${#name} -le 64 ] || err "$name: name > 64 chars"
  [ ${#desc} -le 1024 ] || err "$name: description > 1024 chars"

  lines=$(wc -l < "$f")
  [ "$lines" -le 300 ] || warn "$name: SKILL.md is $lines lines (>300)"

  # description should be a trigger rule, not a workflow summary
  case "$desc" in
    *"Use when"*) : ;;
    *) warn "$name: description does not contain 'Use when'";;
  esac

  # every skill must appear in README as `name`
  grep -q "\`$name\`" README.md 2>/dev/null || err "$name: not listed in README.md"
done

# README must not list skills that don't exist (only names under a "| `x` |" table cell)
if [ -f README.md ]; then
  for listed in $(grep -oE '^\| `[a-z0-9-]+`' README.md | grep -oE '[a-z0-9-]+' | sort -u); do
    [ -d "skills/$listed" ] || warn "README lists non-existent skill: $listed"
  done
fi

echo "---"
echo "validate: $errors error(s), $warns warning(s)"
[ "$errors" -eq 0 ]
