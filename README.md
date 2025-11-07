# Pokemon Scout 🔍

A web application for monitoring Pokemon Trading Card Game (TCG) products from Hungarian online retailers. Get real-time price tracking, stock alerts, and never miss a deal!

## Features

### 👤 User Authentication & Management
- **Secure Registration & Login**: JWT-based authentication with bcrypt password hashing
- **Personal Dashboard**: Manage your alerts and profile in one place
- **Admin Panel**: System statistics, user management, and manual scrape triggers
- **Role-Based Access**: Admin and regular user roles with protected endpoints

### 🛍️ Multi-Store Monitoring
Track products from multiple Hungarian Pokemon TCG retailers:
- **Metagames** (metagames.hu)
- **TCGBolt** (tcgbolt.hu)
- **Varázslatos Játékok** (varazslatosjatekok.hu)

### 📧 Smart Email Alerts (User-Based)
Create and manage personalized alerts from your dashboard:
- **Price Target Alerts**: Get notified when a product drops to your target price
- **In-Stock Alerts**: Be the first to know when a product becomes available
- **Restock Alerts**: Get notified when out-of-stock items come back
- **Edit & Delete**: Full control over your alert settings
- **Alert History**: Track when you were last notified

### 🔄 Automated Scraping
- Scheduled automatic updates (every 30 minutes by default)
- Manual scraping on-demand via admin panel
- Price history tracking
- Stock status monitoring
- Admin-controlled scrape triggers

### 🌐 Web Interface
- **Public Product Browser**: Browse products without login
- **User Dashboard**: Personal alert management after login
- **Admin Dashboard**: System stats and control panel
- Search products by name
- Filter by store or stock status
- View current prices and availability
- Direct links to store product pages
- Mobile-friendly design

### 🚀 One-Click Deployment
Deploy to your favorite platform:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

Supported platforms:
- ✅ Vercel
- ✅ Railway (recommended for production)
- ✅ Render
- ✅ Custom Node.js hosting

## Technology Stack

- **Runtime**: Node.js 20+
- **Backend**: Express.js 5.x
- **Database**: SQLite (sql.js)
- **Scraping**: Axios + Cheerio
- **Scheduling**: node-cron
- **Email**: Nodemailer (SMTP)
- **Frontend**: Next.js (static export)
- **Validation**: Zod
- **Language**: TypeScript

## Quick Start

### Prerequisites
- Node.js 20 or higher
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/pokemon-scout.git
cd pokemon-scout
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the server
```bash
npm start
```

5. Access the application
```
http://localhost:4000
```

## Configuration

All configuration is done via environment variables. See `.env.example` for a complete list of options.

### Required Variables

```bash
PORT=4000                    # Server port (auto-set by hosting platforms)
BASE_URL=http://localhost:4000   # Application base URL
```

### Optional Variables

```bash
# Authentication
JWT_SECRET=change-this-to-a-random-secret-in-production

# Scraper Configuration
SCRAPER_CRON=*/30 * * * *   # Run every 30 minutes
SCRAPER_CONCURRENCY=2        # Number of concurrent requests
SCRAPER_DELAY_MS=750         # Delay between requests

# Email Alerts (optional)
ALERT_FROM_EMAIL=no-reply@your-domain.com
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# Advanced
BASE_PATH=                   # Deploy to subdirectory (e.g., /pokemonscout)
METAGAMES_PAGE_LIMIT=        # Limit pages to scrape
```

## API Documentation

### Authentication

**Register**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Get Current User**
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Logout**
```http
POST /api/auth/logout
```

### Products (Public)

**List Products**
```http
GET /api/products?search=booster&inStock=true&limit=50&offset=0
```

Query parameters:
- `storeId` (optional): Filter by store
- `search` (optional): Search product names
- `inStock` (optional): Filter by stock status (true/false)
- `limit` (optional): Number of results (max 500)
- `offset` (optional): Pagination offset

**Get Product Details**
```http
GET /api/products/:id
```

### User Alerts (Protected - Requires Authentication)

**List My Alerts**
```http
GET /api/user/alerts
Authorization: Bearer <token>
```

**Create Alert**
```http
POST /api/user/alerts
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product-123",
  "targetPriceHuf": 5000,
  "notifyOnInStock": true,
  "notifyOnRestock": true
}
```

**Update Alert**
```http
PUT /api/user/alerts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetPriceHuf": 4500,
  "notifyOnInStock": false,
  "notifyOnRestock": true
}
```

**Delete Alert**
```http
DELETE /api/user/alerts/:id
Authorization: Bearer <token>
```

### Admin (Protected - Requires Admin Role)

**Get System Statistics**
```http
GET /api/admin/stats
Authorization: Bearer <token>
```

**List All Users**
```http
GET /api/admin/users?limit=50&offset=0
Authorization: Bearer <token>
```

**Trigger Manual Scrape**
```http
POST /api/admin/scrape
Authorization: Bearer <token>
Content-Type: application/json

{
  "storeSlug": "metagames"  // Optional: specific store or omit for all
}
```

### Stores

**List Stores**
```http
GET /api/stores
```

### Scraping

**Trigger Manual Scrape**
```http
POST /api/scrape
Content-Type: application/json

{
  "storeSlug": "metagames"  // Optional: specific store or omit for all
}
```

### System

**Health Check**
```http
GET /health
```

**View Logs**
```http
GET /api/logs
```

**Clear Logs**
```http
POST /api/logs/clear
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions for:
- Vercel
- Railway
- Render
- Custom hosting

### Important: Database Persistence

This application uses SQLite by default:
- **Vercel**: Database resets on each deployment (serverless limitation)
- **Railway/Render**: Database persists with proper volume configuration
- **Production**: Consider Railway or a hosted database for data persistence

## Project Structure

```
pokemon-scout/
├── backend/              # Backend source code
│   ├── index.js         # Main server file
│   ├── config.js        # Configuration management
│   ├── db.js            # Database setup and migrations
│   ├── repositories/    # Data access layer
│   ├── services/        # Business logic (scraping, alerts)
│   ├── stores/          # Store-specific scrapers
│   └── utils/           # Helper utilities
├── frontend/            # Next.js frontend
│   └── out/            # Static build output
├── server.cjs          # Server entry point
├── data.db             # SQLite database (generated)
├── .env.example        # Environment variables template
└── package.json        # Project dependencies
```

## Development

### Running Locally

```bash
npm start
```

### Manual Scraping

Trigger a manual scrape via API:
```bash
curl -X POST http://localhost:4000/api/scrape
```

### Viewing Logs

```bash
curl http://localhost:4000/api/logs
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built for the Hungarian Pokemon TCG community
- Uses public product data from retailer websites
- Respects rate limits and robots.txt policies

## Support

For deployment help, see [DEPLOYMENT.md](DEPLOYMENT.md).

For issues or questions, please open an issue on GitHub.

---

Made with ❤️ for Pokemon TCG collectors
