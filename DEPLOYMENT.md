# ELPMS Deployment Guide

This guide covers deploying the Employee Leave & Payroll Management System to production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Security Considerations](#security-considerations)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Prerequisites

### Required Software
- Node.js 18+ and npm
- PostgreSQL 14+
- Git
- SSL certificate (for production)

### Recommended Services
- **Hosting**: DigitalOcean, AWS, Heroku, or similar
- **Database**: AWS RDS, DigitalOcean Managed Databases, or self-hosted PostgreSQL
- **Storage**: AWS S3 or similar for PDF storage
- **Email**: SendGrid, Mailgun, or AWS SES (for notifications)

---

## Environment Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd HRMS
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Database Setup

### 1. Create PostgreSQL Database
```sql
CREATE DATABASE elpms_production;
CREATE USER elpms_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE elpms_production TO elpms_user;
```

### 2. Configure Database Connection
Create `backend/.env` file:
```env
DATABASE_URL="postgresql://elpms_user:your-secure-password@localhost:5432/elpms_production"
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-long"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=production

# Company Details
COMPANY_NAME="Your Company Name"
COMPANY_ADDRESS="Your Company Address"
COMPANY_PHONE="+1234567890"
COMPANY_EMAIL="hr@yourcompany.com"

# Working Days Configuration
WORKING_DAYS_PER_MONTH=22

# File Upload
UPLOAD_DIR="/var/www/elpms/uploads"
MAX_FILE_SIZE=5242880
```

### 3. Run Migrations
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 4. Seed Initial Data
```bash
npm run seed
```

---

## Backend Deployment

### Option 1: PM2 (Recommended for VPS)

#### 1. Install PM2
```bash
npm install -g pm2
```

#### 2. Build Backend
```bash
cd backend
npm run build
```

#### 3. Start with PM2
```bash
pm2 start dist/server.js --name elpms-backend
pm2 save
pm2 startup
```

#### 4. Configure PM2 Ecosystem (Optional)
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'elpms-backend',
    script: './dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

Start with:
```bash
pm2 start ecosystem.config.js
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile
`backend/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/server.js"]
```

#### 2. Create docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/elpms
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=elpms
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres-data:
```

#### 3. Deploy
```bash
docker-compose up -d
```

### Option 3: Heroku Deployment

#### 1. Create Heroku App
```bash
heroku create elpms-backend
```

#### 2. Add PostgreSQL
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

#### 3. Set Environment Variables
```bash
heroku config:set JWT_SECRET="your-secret-key"
heroku config:set NODE_ENV=production
```

#### 4. Deploy
```bash
git push heroku main
```

#### 5. Run Migrations
```bash
heroku run npm run prisma:migrate
heroku run npm run seed
```

---

## Frontend Deployment

### 1. Build Frontend
```bash
cd frontend
npm run build
```

### Option 1: Nginx (Recommended)

#### 1. Install Nginx
```bash
sudo apt install nginx
```

#### 2. Configure Nginx
Create `/etc/nginx/sites-available/elpms`:
```nginx
server {
    listen 80;
    server_name elpms.yourcompany.com;

    root /var/www/elpms/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/elpms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. Setup SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d elpms.yourcompany.com
```

### Option 2: Netlify

#### 1. Create `netlify.toml`
```toml
[build]
  base = "frontend"
  publish = "build"
  command = "npm run build"

[[redirects]]
  from = "/api/*"
  to = "https://your-backend-url.com/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 2. Deploy
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Option 3: Vercel

```bash
npm install -g vercel
vercel --prod
```

---

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use strong, unique secrets
- Rotate JWT secrets periodically

### 2. Database Security
- Use strong passwords
- Enable SSL/TLS connections
- Regular backups
- Implement connection pooling

### 3. API Security
- Enable CORS only for trusted domains
- Implement rate limiting
- Add request size limits
- Use helmet.js for security headers

Add to backend:
```bash
npm install helmet express-rate-limit
```

Update `server.ts`:
```typescript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);
```

### 4. HTTPS
Always use HTTPS in production

### 5. File Upload Security
- Validate file types
- Limit file sizes
- Scan for malware
- Store files outside web root

### 6. Audit Logging
- Enable audit logging for all critical operations
- Monitor logs regularly
- Set up alerts for suspicious activities

---

## Monitoring and Maintenance

### 1. Application Monitoring

#### PM2 Monitoring
```bash
pm2 monit
pm2 logs elpms-backend
```

#### Log Management
```bash
# Setup log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 2. Database Backups

#### Automated PostgreSQL Backups
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/elpms"
pg_dump -h localhost -U elpms_user elpms_production > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

Add to crontab:
```bash
0 2 * * * /path/to/backup-script.sh
```

### 3. Health Checks

Create a health check endpoint:
```typescript
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});
```

### 4. Performance Monitoring
- Use tools like New Relic, DataDog, or Prometheus
- Monitor response times
- Track error rates
- Monitor database query performance

### 5. Regular Maintenance
- Update dependencies regularly
- Apply security patches
- Review and optimize database queries
- Monitor disk space
- Review audit logs

---

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database status
sudo systemctl status postgresql

# Check connections
psql -U elpms_user -d elpms_production -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Application Crashes
```bash
# Check PM2 logs
pm2 logs elpms-backend --lines 100

# Restart application
pm2 restart elpms-backend
```

#### High Memory Usage
```bash
# Monitor memory
pm2 monit

# Restart with increased memory
pm2 restart elpms-backend --max-memory-restart 500M
```

---

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (Nginx, HAProxy, AWS ALB)
- Deploy multiple backend instances
- Use session-less authentication (JWT)

### Database Scaling
- Implement read replicas
- Use connection pooling
- Consider caching layer (Redis)

### File Storage
- Move to cloud storage (S3, Google Cloud Storage)
- Implement CDN for static assets

---

## Support

For deployment issues:
1. Check application logs
2. Review environment configuration
3. Verify database connectivity
4. Check firewall rules
5. Review security group settings

For additional help, refer to the main README.md or create an issue in the repository.
