#!/bin/bash
# Mom Shop CMS - Oracle Always-Free VM setup (Ubuntu 22.04). Run once as ubuntu user.
set -e
APP_DIR="$HOME/mom-shop-cms"
echo "== Node 22 =="
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
fi
node --version
echo "== App =="
# Bundle is uploaded to $APP_DIR before running this (see deploy steps).
cd "$APP_DIR/server"
npm install --production
echo "== Service =="
sudo cp mom-shop.service /etc/systemd/system/
sudo sed -i "s|WorkingDirectory=.*|WorkingDirectory=$APP_DIR/server|" /etc/systemd/system/mom-shop.service
sudo systemctl daemon-reload
sudo systemctl enable --now mom-shop
sleep 3
curl -s localhost:3000/api/health
echo ""
echo "LIVE: open http://<this-VM-public-IP>:3000 (port 3000 must be open in subnet security list)"
