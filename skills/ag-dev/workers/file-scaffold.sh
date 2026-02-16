#!/usr/bin/env bash
set -euo pipefail

# Worker: file-scaffold — Create file structure from templates or conventions
# Usage: file-scaffold.sh <project_dir> <type> <name> [extra_args...]
#   Types: component, page, api, hook, util, test, module, model
# Output: JSON { success, output, files_changed }

PROJECT_DIR="${1:-.}"
SCAFFOLD_TYPE="${2:-component}"
NAME="${3:-}"
shift 3 || true
EXTRA_ARGS="${*:-}"

if [[ -z "$NAME" ]]; then
  jq -n '{"success":false,"output":"Usage: file-scaffold.sh <project_dir> <type> <name>","files_changed":[]}'
  exit 1
fi

cd "$PROJECT_DIR"

###############################################################################
# Auto-detect project type
###############################################################################

detect_project_type() {
  if [[ -f "next.config.js" || -f "next.config.mjs" || -f "next.config.ts" ]]; then
    echo "nextjs"; return
  fi
  if [[ -f "vite.config.ts" || -f "vite.config.js" ]]; then
    echo "vite-react"; return
  fi
  if [[ -f "package.json" ]]; then
    if jq -e '.dependencies.react' package.json &>/dev/null; then
      echo "react"; return
    fi
    if jq -e '.dependencies.vue' package.json &>/dev/null; then
      echo "vue"; return
    fi
    echo "node"; return
  fi
  if [[ -f "pyproject.toml" || -f "requirements.txt" ]]; then
    echo "python"; return
  fi
  if [[ -f "Cargo.toml" ]]; then
    echo "rust"; return
  fi
  if [[ -f "go.mod" ]]; then
    echo "go"; return
  fi
  echo "generic"
}

PROJECT_TYPE=$(detect_project_type)

###############################################################################
# Determine file extension and paths
###############################################################################

EXT="ts"
case "$PROJECT_TYPE" in
  nextjs|vite-react|react) EXT="tsx" ;;
  vue) EXT="vue" ;;
  python) EXT="py" ;;
  rust) EXT="rs" ;;
  go) EXT="go" ;;
  node) EXT="ts" ;;
  *) EXT="ts" ;;
esac

# PascalCase for component names
PASCAL_NAME=$(echo "$NAME" | sed -E 's/(^|[-_ ])([a-z])/\U\2/g')
# kebab-case
KEBAB_NAME=$(echo "$NAME" | sed -E 's/([A-Z])/-\L\1/g; s/^-//; s/_/-/g')
# snake_case
SNAKE_NAME=$(echo "$NAME" | sed -E 's/([A-Z])/_\L\1/g; s/^_//; s/-/_/g')

###############################################################################
# Generate files based on type
###############################################################################

CREATED_FILES=()
OUTPUT_MSG=""

scaffold_react_component() {
  local dir="src/components/${PASCAL_NAME}"
  mkdir -p "$dir"

  cat > "$dir/${PASCAL_NAME}.${EXT}" << TMPL
interface ${PASCAL_NAME}Props {
  className?: string;
}

export function ${PASCAL_NAME}({ className }: ${PASCAL_NAME}Props) {
  return (
    <div className={className}>
      <h2>${PASCAL_NAME}</h2>
    </div>
  );
}
TMPL

  cat > "$dir/index.ts" << TMPL
export { ${PASCAL_NAME} } from './${PASCAL_NAME}';
TMPL

  CREATED_FILES+=("$dir/${PASCAL_NAME}.${EXT}" "$dir/index.ts")
}

scaffold_nextjs_page() {
  local dir="src/app/${KEBAB_NAME}"
  mkdir -p "$dir"

  cat > "$dir/page.tsx" << TMPL
export default function ${PASCAL_NAME}Page() {
  return (
    <main>
      <h1>${PASCAL_NAME}</h1>
    </main>
  );
}
TMPL

  CREATED_FILES+=("$dir/page.tsx")
}

scaffold_api_route() {
  local dir
  if [[ "$PROJECT_TYPE" == "nextjs" ]]; then
    dir="src/app/api/${KEBAB_NAME}"
    mkdir -p "$dir"
    cat > "$dir/route.ts" << TMPL
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: '${PASCAL_NAME} endpoint' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ received: body });
}
TMPL
    CREATED_FILES+=("$dir/route.ts")
  else
    dir="src/api"
    mkdir -p "$dir"
    cat > "$dir/${KEBAB_NAME}.ts" << TMPL
export function handle${PASCAL_NAME}(req: any, res: any) {
  res.json({ message: '${PASCAL_NAME} endpoint' });
}
TMPL
    CREATED_FILES+=("$dir/${KEBAB_NAME}.ts")
  fi
}

scaffold_hook() {
  local dir="src/hooks"
  mkdir -p "$dir"

  cat > "$dir/use-${KEBAB_NAME}.ts" << TMPL
import { useState, useEffect } from 'react';

export function use${PASCAL_NAME}() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return { data, loading };
}
TMPL

  CREATED_FILES+=("$dir/use-${KEBAB_NAME}.ts")
}

scaffold_test() {
  local dir="tests"
  [[ -d "src/__tests__" ]] && dir="src/__tests__"
  [[ -d "__tests__" ]] && dir="__tests__"
  mkdir -p "$dir"

  cat > "$dir/${KEBAB_NAME}.test.${EXT}" << TMPL
import { describe, it, expect } from 'vitest';

describe('${PASCAL_NAME}', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
TMPL

  CREATED_FILES+=("$dir/${KEBAB_NAME}.test.${EXT}")
}

scaffold_util() {
  local dir="src/utils"
  [[ -d "src/lib" ]] && dir="src/lib"
  mkdir -p "$dir"

  cat > "$dir/${KEBAB_NAME}.ts" << TMPL
export function ${NAME}() {
  // TODO: implement
}
TMPL

  CREATED_FILES+=("$dir/${KEBAB_NAME}.ts")
}

scaffold_python_module() {
  local dir="src/${SNAKE_NAME}"
  mkdir -p "$dir"

  cat > "$dir/__init__.py" << TMPL
"""${PASCAL_NAME} module."""
TMPL

  cat > "$dir/${SNAKE_NAME}.py" << TMPL
"""${PASCAL_NAME} implementation."""


class ${PASCAL_NAME}:
    def __init__(self):
        pass
TMPL

  CREATED_FILES+=("$dir/__init__.py" "$dir/${SNAKE_NAME}.py")
}

scaffold_generic_module() {
  mkdir -p "src"
  cat > "src/${KEBAB_NAME}.${EXT}" << TMPL
// ${PASCAL_NAME} module
export function ${NAME}() {
  // TODO: implement
}
TMPL
  CREATED_FILES+=("src/${KEBAB_NAME}.${EXT}")
}

# Execute scaffold
case "$SCAFFOLD_TYPE" in
  component)
    if [[ "$PROJECT_TYPE" == "python" ]]; then
      scaffold_python_module
    else
      scaffold_react_component
    fi
    ;;
  page)
    if [[ "$PROJECT_TYPE" == "nextjs" ]]; then
      scaffold_nextjs_page
    else
      scaffold_generic_module
    fi
    ;;
  api)
    scaffold_api_route
    ;;
  hook)
    scaffold_hook
    ;;
  test)
    scaffold_test
    ;;
  util|lib)
    scaffold_util
    ;;
  module)
    if [[ "$PROJECT_TYPE" == "python" ]]; then
      scaffold_python_module
    else
      scaffold_generic_module
    fi
    ;;
  *)
    scaffold_generic_module
    ;;
esac

OUTPUT_MSG="Scaffolded ${SCAFFOLD_TYPE} '${NAME}' (${PROJECT_TYPE} project): ${#CREATED_FILES[@]} files created"

###############################################################################
# Output JSON
###############################################################################

FILES_JSON=$(printf '%s\n' "${CREATED_FILES[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')

jq -n \
  --arg output "$OUTPUT_MSG" \
  --argjson files_changed "$FILES_JSON" \
  --arg project_type "$PROJECT_TYPE" \
  --arg scaffold_type "$SCAFFOLD_TYPE" \
  '{
    success: true,
    output: $output,
    files_changed: $files_changed,
    project_type: $project_type,
    scaffold_type: $scaffold_type
  }'
