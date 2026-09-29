# Mom Shop CMS - MVP

Flow: Live paper -> Save as Potential -> Phone call -> Confirm / Cancel -> Pack/Ship/Deliver
No TikTok scraping.

## Structure
- `server/` - Express cloud server (auth, sync, BS month-end Excel reports 23:30 NPT)
- `stitch-replica/` - Frontend pages (Active orders, Orders ledger, P/L hub, login)

## Run server
cd server
npm install
npm start
Open http://localhost:3000/health -> {"ok":true}

Use `server/.env` for PORT, SECURE_COOKIES. Customer JSON + xlsx reports are git-ignored.

## Money math
subtotal = sum(discounted_price*qty)
total = subtotal - discount_amount + delivery_price
balance_due = total - advance_paid
profit per line = (discounted_price - wholesale_price)*qty
order profit = sum(line_profit) - discount_amount
Monthly revenue = sum(total) of confirmed only. Potential + cancelled excluded.

## Excel sheets
Customers, Products, Orders, Monthly_Statement (month, orders, cancelled, revenue, product_cost, discounts_given, delivery_income, advance_collected, balance_pending, profit, PROFIT/LOSS)
