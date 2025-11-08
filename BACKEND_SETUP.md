# Backend Setup Guide for Vercel

## ✅ Backend Status
Your backend is now properly configured as a Vercel Serverless Function and is **WORKING**.

The API is accessible at: `https://adbize.com/api/*`

---

## 🔧 Required Configuration

### Database Setup

Your backend requires a PostgreSQL database. Configure it in Vercel:

1. **Go to your Vercel Dashboard**
   - Navigate to your project: https://vercel.com/adbize-projects/demoiram
   - Go to Settings → Environment Variables

2. **Add the following environment variable:**
   ```
   DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
   ```

3. **Get a PostgreSQL database:**

   **Option A: Vercel Postgres (Recommended)**
   - In your Vercel project dashboard
   - Go to Storage tab
   - Click "Create Database"
   - Select "Postgres"
   - It will automatically add the DATABASE_URL to your environment variables

   **Option B: External Provider**
   - [Neon](https://neon.tech) - Free tier with 3 projects
   - [Supabase](https://supabase.com) - Free tier with 2 projects
   - [Railway](https://railway.app) - $5/month
   - [ElephantSQL](https://www.elephantsql.com) - Free tier available

4. **Redeploy after adding environment variable:**
   ```bash
   vercel --prod
   ```

---

## 📊 Database Schema

The database tables are created automatically when the backend starts. The schema includes:

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,

  -- Service usage counters (3 uses each by default)
  chatbot_uses INTEGER DEFAULT 3,
  agent_generator_uses INTEGER DEFAULT 3,
  document_analysis_uses INTEGER DEFAULT 3,
  marketplace_uses INTEGER DEFAULT 3,
  predictor_uses INTEGER DEFAULT 3,
  sentiment_uses INTEGER DEFAULT 3,
  transcription_uses INTEGER DEFAULT 3,
  vision_uses INTEGER DEFAULT 3,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Custom Chatbots Table
Automatically created by the backend initialization.

---

## 🧪 Testing the Backend

Once the database is configured, test your API:

### Health Check
```bash
curl https://adbize.com/api/health
```
Expected: `{"status":"ok","message":"Server is running"}`

### Register User
```bash
curl -X POST https://adbize.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "securePassword123"
  }'
```
Expected: User object with token

### Login
```bash
curl -X POST https://adbize.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securePassword123"
  }'
```
Expected: User object with token

---

## 🚀 API Endpoints

All endpoints are now accessible at `https://adbize.com/api/*`:

- **Authentication:**
  - `POST /api/auth/register` - Register new user
  - `POST /api/auth/login` - Login user
  - `GET /api/auth/me` - Get current user (requires auth token)

- **Chatbot:**
  - `POST /api/chatbot` - Chat with AI

- **Custom Chatbot:**
  - `POST /api/custom-chatbot/create` - Create custom chatbot
  - `POST /api/custom-chatbot/chat/:id` - Chat with custom bot
  - `GET /api/custom-chatbot/user` - Get user's chatbots

- **Agent Generator:**
  - `POST /api/agent` - Generate AI agent

- **Marketplace:**
  - `GET /api/marketplace` - List marketplace items

- **Python API:**
  - Various endpoints under `/python-api/*`

---

## 🔐 Required Environment Variables

Configure these in Vercel → Settings → Environment Variables:

```env
# Database (Required)
DATABASE_URL=postgresql://...

# JWT Secret (Required for auth)
JWT_SECRET=your-super-secret-jwt-key-change-this

# OpenAI API Key (Required for AI features)
OPENAI_API_KEY=sk-...

# DeepSeek API (Optional - for custom chatbots)
DEEPSEEK_API_KEY=...
```

---

## 📝 Current Status

✅ **Working:**
- Backend serverless function deployed
- API routes configured
- Database initialization code ready
- All endpoints accessible

⚠️ **Pending:**
- Add DATABASE_URL environment variable in Vercel
- Optionally add other API keys for AI features

---

## 🔍 Troubleshooting

### "relation 'users' does not exist"
**Solution:** Add DATABASE_URL environment variable and redeploy

### "Connection refused" or timeout errors
**Solution:** Ensure your database allows connections from Vercel IPs (most providers do by default)

### "JWT must be provided"
**Solution:** Add JWT_SECRET environment variable

### API returns 500 errors
**Solution:** Check Vercel function logs:
```bash
vercel logs https://adbize.com --follow
```

---

## 📚 Additional Resources

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

---

**Need help?** Check the Vercel logs or open an issue in the repository.
