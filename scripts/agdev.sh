#!/bin/bash

# AG Dev — Start/Stop/Status/Restart
# Uso: ./scripts/agdev.sh [start|stop|status|restart]

AG_DEV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$AG_DEV_DIR/data/agdev.pid"
SERVER_SCRIPT="$AG_DEV_DIR/server/server.js"
LOG_FILE="$AG_DEV_DIR/data/agdev.log"
PORT=${AG_DEV_PORT:-3456}

# Ensure data directory exists
mkdir -p "$AG_DEV_DIR/data"

case "${1:-status}" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "❌ AG Dev já está rodando (PID: $(cat "$PID_FILE"))"
      echo "   Use 'agdev stop' primeiro ou 'agdev restart'"
      exit 1
    fi

    echo "🚀 Iniciando AG Dev..."
    cd "$AG_DEV_DIR"
    
    # Start in background, redirect output to log file
    nohup node "$SERVER_SCRIPT" > "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    
    # Wait a moment and check if it's still running
    sleep 2
    if kill -0 $PID 2>/dev/null; then
      echo "✅ AG Dev iniciado com sucesso"
      echo "   PID: $PID"
      echo "   URL: http://localhost:$PORT"
      echo "   Log: $LOG_FILE"
      echo "   Use 'agdev status' para verificar o estado"
    else
      echo "❌ Falha ao iniciar AG Dev"
      echo "   Verifique o log: $LOG_FILE"
      rm -f "$PID_FILE"
      exit 1
    fi
    ;;

  stop)
    if [ ! -f "$PID_FILE" ]; then
      echo "ℹ️  AG Dev não está rodando (arquivo PID não encontrado)"
      exit 0
    fi

    PID=$(cat "$PID_FILE")
    if ! kill -0 "$PID" 2>/dev/null; then
      echo "ℹ️  AG Dev não está rodando (processo PID $PID não encontrado)"
      rm -f "$PID_FILE"
      exit 0
    fi

    echo "⏹️  Parando AG Dev (PID: $PID)..."
    kill "$PID"
    
    # Wait for graceful shutdown
    for i in {1..10}; do
      if ! kill -0 "$PID" 2>/dev/null; then
        echo "✅ AG Dev parado com sucesso"
        rm -f "$PID_FILE"
        exit 0
      fi
      sleep 1
    done

    # Force kill if still running
    echo "⚠️  Forçando parada..."
    kill -9 "$PID" 2>/dev/null
    rm -f "$PID_FILE"
    echo "✅ AG Dev parado (force kill)"
    ;;

  restart)
    echo "🔄 Reiniciando AG Dev..."
    "$0" stop
    sleep 2
    "$0" start
    ;;

  status)
    echo "📊 Status do AG Dev"
    echo "=================="
    
    if [ ! -f "$PID_FILE" ]; then
      echo "❌ Status: Não está rodando"
      echo "   Arquivo PID: Não encontrado"
      exit 1
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "✅ Status: Rodando"
      echo "   PID: $PID"
      echo "   Porta: $PORT"
      
      # Get runtime info from process
      UPTIME=$(ps -o etime= -p "$PID" 2>/dev/null | tr -d ' ')
      MEM=$(ps -o rss= -p "$PID" 2>/dev/null | tr -d ' ')
      if [ -n "$UPTIME" ]; then
        echo "   Uptime: $UPTIME"
      fi
      if [ -n "$MEM" ]; then
        echo "   Memória: $(( MEM / 1024 ))MB"
      fi
      
      # Try to get health status via curl
      HEALTH_URL="http://localhost:$PORT/health"
      if command -v curl >/dev/null 2>&1; then
        echo "   Health check:"
        if HEALTH_RESULT=$(curl -s -m 5 "$HEALTH_URL" 2>/dev/null); then
          echo "     ✅ API respondendo"
          # Parse JSON response if jq is available
          if command -v jq >/dev/null 2>&1; then
            STATUS=$(echo "$HEALTH_RESULT" | jq -r '.status // "unknown"')
            AGENTS=$(echo "$HEALTH_RESULT" | jq -r '.agents // "?"')
            SUPERSKILLS=$(echo "$HEALTH_RESULT" | jq -r '.superskills // "?"')
            echo "     Status: $STATUS"
            echo "     Agentes ativos: $AGENTS"
            echo "     SuperSkills: $SUPERSKILLS"
          fi
        else
          echo "     ❌ API não respondendo"
        fi
      fi
    else
      echo "❌ Status: Processo morto"
      echo "   PID arquivo: $PID (processo não encontrado)"
      rm -f "$PID_FILE"
      exit 1
    fi
    ;;

  *)
    echo "AG Dev — Multi-Agent Development Orchestration"
    echo ""
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos:"
    echo "  start    Inicia o AG Dev em background"
    echo "  stop     Para o AG Dev"
    echo "  restart  Para e reinicia o AG Dev"  
    echo "  status   Mostra o status atual (default)"
    echo ""
    echo "Variáveis de ambiente:"
    echo "  AG_DEV_PORT     Porta do servidor (default: 3456)"
    echo "  AG_DEV_HOST     Host do servidor (default: config.json)"
    echo "  AG_DEV_DATA_DIR Diretório de dados (default: config.json)"
    echo ""
    echo "URLs:"
    echo "  Interface:  http://localhost:$PORT"
    echo "  API:        http://localhost:$PORT/api/*"
    echo "  Health:     http://localhost:$PORT/health"
    echo "  SSE Events: http://localhost:$PORT/api/events"
    exit 0
    ;;
esac