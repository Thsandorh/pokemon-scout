# Pokemon Scout - Deployment Guide

## Platform Compatibility

This application is now compatible with the following hosting platforms:
- ✅ Vercel
- ✅ Railway
- ✅ Render
- ✅ Custom Node.js hosting

## Quick Deploy

### Vercel

1. Fork/clone this repository
2. Import project to Vercel
3. Configure environment variables (see below)
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

### Railway

1. Fork/clone this repository
2. Create new project in Railway
3. Connect your repository
4. Configure environment variables (see below)
5. Deploy!

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

### Render

1. Fork/clone this repository
2. Create new Web Service in Render
3. Connect your repository
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Configure environment variables (see below)
7. Deploy!

## Environment Variables

### Required Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Server Configuration
PORT=4000                    # Will be auto-set by hosting platforms
BASE_URL=https://your-domain.com
BASE_PATH=                   # Optional: use if deploying to a subdirectory

# Scraper Configuration
SCRAPER_CRON=*/30 * * * *   # Run every 30 minutes
SCRAPER_CONCURRENCY=2
SCRAPER_DELAY_MS=750
```

### Optional Variables

```bash
# Email Alerts (if you want to send email notifications)
ALERT_FROM_EMAIL=no-reply@your-domain.com
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# Metagames Scraper
METAGAMES_BASE_URL=https://www.metagames.hu/gyujtogetos-kartyajatekok/pokemon-tcg/termekek
METAGAMES_PAGE_LIMIT=       # Optional: limit pages to scrape
```

## Platform-Specific Notes

### Vercel
- ✅ Fully supported
- ⚠️ Note: Cron jobs run only when the app receives requests (serverless limitation)
- ⚠️ SQLite database resets on each deployment (consider using a hosted database for production)

### Railway
- ✅ Fully supported
- ✅ Persistent storage available
- ✅ Cron jobs work as expected
- Recommended for production use

### Important: Database Persistence

This application uses SQLite by default, which stores data in a `data.db` file:

- **Vercel**: Database will reset on each deployment (serverless limitation)
- **Railway/Render**: Database persists if you configure persistent storage
- **Custom hosting**: Database persists on the file system

For production deployments where data persistence is critical, consider:
1. Using Railway or similar platform with persistent volumes
2. Migrating to a hosted database (PostgreSQL, MySQL, etc.)

## Local Development

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Install dependencies: `npm install`
4. Start the server: `npm start`
5. Access at `http://localhost:4000`

## Troubleshooting

### Port Issues
Most hosting platforms automatically set the `PORT` environment variable. If you're deploying to a custom host, ensure `PORT` is set correctly.

### Base Path Issues
If deploying to a subdirectory (e.g., `yourdomain.com/pokemonscout`), set:
```bash
BASE_PATH=/pokemonscout
BASE_URL=https://yourdomain.com/pokemonscout
```

### Database Reset on Vercel
This is expected behavior on serverless platforms. For persistent data, use Railway or a hosted database solution.
