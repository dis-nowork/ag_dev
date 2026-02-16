#!/usr/bin/env bash
# Gotchas Memory — Persistent knowledge base of lessons learned
# Stores in .agdev/gotchas.json, queryable by agents before starting tasks
#
# Usage:
#   gotchas.sh add "<title>" "<description>" [category] [severity]
#   gotchas.sh list [--category X] [--severity Y]
#   gotchas.sh search "<query>"
#   gotchas.sh context "<task description>"   # returns relevant gotchas for a task
#   gotchas.sh remove <id>
#   gotchas.sh stats

set -euo pipefail

WORKSPACE="${WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)}"
GOTCHAS_FILE="$WORKSPACE/.agdev/gotchas.json"

# ═══════════════════════════════════════════════════════════════════════════════
#                              INIT
# ═══════════════════════════════════════════════════════════════════════════════

ensure_file() {
  mkdir -p "$(dirname "$GOTCHAS_FILE")"
  if [ ! -f "$GOTCHAS_FILE" ]; then
    echo '[]' > "$GOTCHAS_FILE"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#                              COMMANDS
# ═══════════════════════════════════════════════════════════════════════════════

cmd_add() {
  local title="${1:?Usage: gotchas.sh add '<title>' '<description>' [category] [severity]}"
  local description="${2:?Usage: gotchas.sh add '<title>' '<description>' [category] [severity]}"
  local category="${3:-general}"
  local severity="${4:-medium}"

  ensure_file

  # Generate next ID
  local max_id
  max_id="$(jq '[.[].id // "g000" | ltrimstr("g") | tonumber] | max // 0' "$GOTCHAS_FILE")"
  local next_id
  next_id="$(printf "g%03d" $((max_id + 1)))"

  local today
  today="$(date +%Y-%m-%d)"

  # Check for duplicate (same title)
  local dup
  dup="$(jq --arg t "$title" '[.[] | select(.title == $t)] | length' "$GOTCHAS_FILE")"
  if [ "$dup" -gt 0 ]; then
    echo "WARN: Gotcha with title '$title' already exists. Incrementing hits." >&2
    jq --arg t "$title" \
      'map(if .title == $t then .hits += 1 | .updated = (now | todate | split("T")[0]) else . end)' \
      "$GOTCHAS_FILE" > "$GOTCHAS_FILE.tmp" && mv "$GOTCHAS_FILE.tmp" "$GOTCHAS_FILE"
    jq --arg t "$title" '.[] | select(.title == $t)' "$GOTCHAS_FILE"
    return
  fi

  # Add new gotcha
  jq --arg id "$next_id" \
     --arg title "$title" \
     --arg desc "$description" \
     --arg cat "$category" \
     --arg sev "$severity" \
     --arg date "$today" \
     '. += [{
       id: $id,
       title: $title,
       description: $desc,
       category: $cat,
       severity: $sev,
       created: $date,
       hits: 0
     }]' "$GOTCHAS_FILE" > "$GOTCHAS_FILE.tmp" && mv "$GOTCHAS_FILE.tmp" "$GOTCHAS_FILE"

  jq --arg id "$next_id" '.[] | select(.id == $id)' "$GOTCHAS_FILE"
}

cmd_list() {
  ensure_file

  local filter_cat="" filter_sev=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --category) filter_cat="$2"; shift 2 ;;
      --severity) filter_sev="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  local jq_filter="."

  if [ -n "$filter_cat" ]; then
    jq_filter="$jq_filter | map(select(.category == \"$filter_cat\"))"
  fi

  if [ -n "$filter_sev" ]; then
    jq_filter="$jq_filter | map(select(.severity == \"$filter_sev\"))"
  fi

  jq "$jq_filter" "$GOTCHAS_FILE"
}

cmd_search() {
  local query="${1:?Usage: gotchas.sh search '<query>'}"
  ensure_file

  # Split query into words and find gotchas matching any word (case-insensitive)
  local words
  words="$(echo "$query" | tr '[:upper:]' '[:lower:]' | tr -s ' ' '\n')"

  # Build jq filter: check if title or description contains any query word
  jq --arg q "$query" '
    ($q | ascii_downcase | split(" ")) as $words |
    map(
      . as $item |
      ($item.title | ascii_downcase) as $t |
      ($item.description | ascii_downcase) as $d |
      ($item.category | ascii_downcase) as $c |
      select(
        any($words[]; . as $w | ($t | contains($w)) or ($d | contains($w)) or ($c | contains($w)))
      )
    )
  ' "$GOTCHAS_FILE"
}

cmd_context() {
  # Returns gotchas relevant to a task description, sorted by relevance
  # This is what agents call before starting work
  local task="${1:?Usage: gotchas.sh context '<task description>'}"
  ensure_file

  local count
  count="$(jq 'length' "$GOTCHAS_FILE")"
  if [ "$count" -eq 0 ]; then
    echo '{"gotchas": [], "count": 0, "message": "No gotchas recorded yet"}'
    return
  fi

  # Find matching gotchas and increment their hit counters
  local matches
  matches="$(jq --arg q "$task" '
    ($q | ascii_downcase | split(" ") | map(select(length > 2))) as $words |
    map(
      . as $item |
      ($item.title | ascii_downcase) as $t |
      ($item.description | ascii_downcase) as $d |
      ($item.category | ascii_downcase) as $c |
      {
        item: $item,
        score: (
          [$words[] | select(
            . as $w | ($t | contains($w)) or ($d | contains($w)) or ($c | contains($w))
          )] | length
        )
      }
    ) |
    map(select(.score > 0)) |
    sort_by(-.score) |
    map(.item)
  ' "$GOTCHAS_FILE")"

  local match_count
  match_count="$(echo "$matches" | jq 'length')"

  # Increment hits for matched gotchas
  if [ "$match_count" -gt 0 ]; then
    local matched_ids
    matched_ids="$(echo "$matches" | jq -r '.[].id')"
    for gid in $matched_ids; do
      jq --arg id "$gid" \
        'map(if .id == $id then .hits += 1 else . end)' \
        "$GOTCHAS_FILE" > "$GOTCHAS_FILE.tmp" && mv "$GOTCHAS_FILE.tmp" "$GOTCHAS_FILE"
    done
  fi

  jq -nc \
    --argjson gotchas "$matches" \
    --argjson count "$match_count" \
    '{gotchas: $gotchas, count: $count}'
}

cmd_remove() {
  local id="${1:?Usage: gotchas.sh remove <id>}"
  ensure_file

  local exists
  exists="$(jq --arg id "$id" '[.[] | select(.id == $id)] | length' "$GOTCHAS_FILE")"

  if [ "$exists" -eq 0 ]; then
    echo "ERROR: Gotcha '$id' not found" >&2
    exit 1
  fi

  jq --arg id "$id" 'map(select(.id != $id))' "$GOTCHAS_FILE" > "$GOTCHAS_FILE.tmp" \
    && mv "$GOTCHAS_FILE.tmp" "$GOTCHAS_FILE"

  echo "{\"removed\": \"$id\"}"
}

cmd_stats() {
  ensure_file

  jq '{
    total: length,
    by_category: (group_by(.category) | map({key: .[0].category, value: length}) | from_entries),
    by_severity: (group_by(.severity) | map({key: .[0].severity, value: length}) | from_entries),
    most_hit: (sort_by(-.hits) | .[0:5] | map({id, title, hits})),
    recent: (sort_by(.created) | reverse | .[0:5] | map({id, title, created}))
  }' "$GOTCHAS_FILE"
}

# ═══════════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════════

usage() {
  cat <<'EOF'
Usage: gotchas.sh <command> [args]

Commands:
  add "<title>" "<description>" [category] [severity]   Record a new gotcha
  list [--category X] [--severity Y]                    List gotchas with optional filters
  search "<query>"                                      Full-text search across gotchas
  context "<task description>"                          Get relevant gotchas for a task
  remove <id>                                           Remove a gotcha by ID
  stats                                                 Show gotcha statistics

Categories: tooling, code, infra, process, security, testing, general
Severities: critical, high, medium, low

Storage: .agdev/gotchas.json
EOF
  exit 1
}

main() {
  [ $# -lt 1 ] && usage

  local cmd="$1"
  shift

  case "$cmd" in
    add)     cmd_add "$@" ;;
    list)    cmd_list "$@" ;;
    search)  cmd_search "$@" ;;
    context) cmd_context "$@" ;;
    remove)  cmd_remove "$@" ;;
    stats)   cmd_stats "$@" ;;
    *)       usage ;;
  esac
}

main "$@"
