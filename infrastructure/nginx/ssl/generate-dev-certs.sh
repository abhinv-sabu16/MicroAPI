#!/usr/bin/env bash
# infrastructure/nginx/ssl/generate-dev-certs.sh
# Generates a self-signed TLS certificate for local development.
# For production use cert-manager + Let's Encrypt (Day 23).
#
# Usage:
#   bash infrastructure/nginx/ssl/generate-dev-certs.sh

set -euo pipefail

CERT_DIR="$(dirname "$0")"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"
DAYS=365

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  echo "✅ Certificates already exist at $CERT_DIR"
  echo "   Delete them and rerun to regenerate."
  exit 0
fi

echo "Generating self-signed TLS certificate..."

openssl req -x509 \
  -newkey rsa:4096 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -days $DAYS \
  -nodes \
  -subj "/C=US/ST=Dev/L=Local/O=MicroAPI/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:api-gateway,IP:127.0.0.1"

chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo "✅ Certificate generated:"
echo "   cert: $CERT_FILE"
echo "   key:  $KEY_FILE"
echo ""
echo "Valid for $DAYS days. Browser will show a security warning"
echo "for self-signed certs — click 'Advanced → Proceed' in dev."