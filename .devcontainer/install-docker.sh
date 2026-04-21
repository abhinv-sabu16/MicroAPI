#!/usr/bin/env bash
# .devcontainer/install-docker.sh
# Installs Docker CE CLI + Compose v2 plugin on Debian bookworm.
# Called from onCreateCommand so it runs once on Codespace creation.
# Does NOT install a Docker daemon — uses the host socket Codespaces provides.

set -euo pipefail

echo "==> Installing Docker CE CLI + Compose v2..."

# Skip if already installed
if command -v docker &>/dev/null; then
  echo "Docker already installed: $(docker --version)"
  exit 0
fi

# Install prerequisites
sudo apt-get update -qq
sudo apt-get install -y -qq \
  ca-certificates \
  curl \
  gnupg \
  lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker apt repository (bookworm)
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker CE CLI and Compose plugin only (no daemon — host provides it)
sudo apt-get update -qq
sudo apt-get install -y -qq \
  docker-ce-cli \
  docker-compose-plugin

# Add current user to docker group so no sudo needed
sudo usermod -aG docker "${USER}" || true

echo "==> Docker installed: $(docker --version)"
echo "==> Compose installed: $(docker compose version)"
