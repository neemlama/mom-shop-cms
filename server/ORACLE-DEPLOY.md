# Oracle Cloud Free Hosting (Always Free VM)

## 1. Create VM (one time, ~10 min)
1. cloud.oracle.com free account (needs card, not charged).
2. Compute > Instances > Create: image Ubuntu 22.04, shape Ampere A1 (free: up to 4 OCPU/24GB) or E2.1 Micro.
3. VCN: create new public subnet, allow SSH (22).
4. Add your SSH public key. Create instance, note public IP.

## 2. Open port (one time)
- Instance > Subnet > Security List > Add Ingress: TCP port 3000 from 0.0.0.0/0.
- SSH in, allow firewall: `sudo ufw allow 3000/tcp` (if ufw active).

## 3. Install + run (SSH)
```
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
git clone <your-repo> mom-shop-cms || (upload folder via scp)
cd mom-shop-cms/server && npm install --production
sudo cp mom-shop.service /etc/systemd/system/
sudo systemctl enable --now mom-shop
curl localhost:3000/api/health
```
Open `http://YOUR_IP:3000` in browser. Visitors tap Create account and get their own private shop space automatically.
Optional: pre-create logins via SSH with `node create-user.js <name> [password] [role]`.

## 4. Files persist
`server/data/shopdb.json` + `server/reports/*.xlsx` live on boot volume (free up to 200GB, kept while instance lives). Back up occasionally: `GET /api/db`.

## Notes
- Cron runs 23:30 Asia/Kathmandu inside the service; keep instance running.
- Idle Always-Free VMs can be reclaimed by Oracle; log in monthly or add tiny uptime ping.
- Optional later: nginx + free HTTPS on port 443.
