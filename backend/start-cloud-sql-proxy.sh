#!/bin/bash
set -euo pipefail

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Load env vars if a .env file exists in the script's directory
if [ -f "${SCRIPT_DIR}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "${SCRIPT_DIR}/.env"
  set +a
fi

INSTANCE_CONN_NAME=${INSTANCE_CONN_NAME:-"docuextractmhosigiri:us-south1:mortgage-db"}
PROXY_PORT=${PROXY_PORT:-5432}
CREDENTIALS_FILE=${GOOGLE_APPLICATION_CREDENTIALS:-""}

echo "🚀 Starting Cloud SQL Proxy..."
echo "================================"
echo ""
echo "📍 Connecting to: ${INSTANCE_CONN_NAME}"
echo "📡 Local port: ${PROXY_PORT}"
echo ""
echo "⚠️  IMPORTANT: Keep this terminal window open while developing!"
echo "   Press Ctrl+C to stop the proxy when done."
echo ""
echo "================================"
echo ""

# Validate credentials file
if [ -z "${CREDENTIALS_FILE}" ] || [ ! -f "${CREDENTIALS_FILE}" ]; then
  echo "❌ ERROR: Service account key file not found!"
  echo ""
  echo "Please set GOOGLE_APPLICATION_CREDENTIALS in your .env file"
  echo "Current value: ${CREDENTIALS_FILE}"
  exit 1
fi

# Ensure proxy binary is present and executable in the script's directory
if [ ! -x "${SCRIPT_DIR}/cloud-sql-proxy" ]; then
  echo "Downloading Cloud SQL Proxy binary..."
  curl -fsSL -o "${SCRIPT_DIR}/cloud-sql-proxy" https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.arm64 || \
  curl -fsSL -o "${SCRIPT_DIR}/cloud-sql-proxy" https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
  chmod +x "${SCRIPT_DIR}/cloud-sql-proxy"
fi

"${SCRIPT_DIR}/cloud-sql-proxy" "${INSTANCE_CONN_NAME}" \
  --credentials-file="${CREDENTIALS_FILE}" \
  --port "${PROXY_PORT}"
