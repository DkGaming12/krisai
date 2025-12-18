# 🚀 Deploy KrisAI ke Railway

Panduan lengkap deploy KrisAI ke Railway.app (gratis)

## 📋 Persiapan

### 1. Push Project ke GitHub

```bash
# Initialize git (jika belum)
cd "D:\KrisAI_V2 - Copy"
git init

# Add semua file
git add .

# Commit
git commit -m "Initial commit - KrisAI v1.0"

# Buat repo baru di GitHub, lalu push
git remote add origin https://github.com/USERNAME/krisai.git
git branch -M main
git push -u origin main
```

## 🚂 Deploy ke Railway

### Opsi 1: Via Railway Dashboard (Paling Mudah)

1. **Buka Railway**
   - Kunjungi https://railway.app
   - Sign up / Login dengan GitHub

2. **Create New Project**
   - Klik "New Project"
   - Pilih "Deploy from GitHub repo"
   - Pilih repository `krisai`
   - Railway akan auto-detect Node.js project

3. **Set Environment Variables**
   - Di Railway dashboard → Project Settings → Variables
   - Tambahkan variabel berikut:
   
   ```
   GROQ_API_KEY=gsk_your_groq_api_key_here
   MIDTRANS_SERVER_KEY=your_midtrans_server_key
   MIDTRANS_CLIENT_KEY=your_midtrans_client_key
   JWT_SECRET=your_super_secret_jwt_key_here
   DEFAULT_TOKENS=100
   PORT=3000
   ```

4. **Deploy**
   - Railway otomatis deploy setelah setup selesai
   - Tunggu ~2-3 menit
   - Klik "View Logs" untuk monitor progress

5. **Generate Domain**
   - Di Settings → Networking
   - Klik "Generate Domain"
   - Copy URL (contoh: `krisai-production.up.railway.app`)

### Opsi 2: Via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway init

# Deploy
railway up

# Set environment variables
railway variables set GROQ_API_KEY=gsk_xxx
railway variables set MIDTRANS_SERVER_KEY=xxx
railway variables set MIDTRANS_CLIENT_KEY=xxx
railway variables set JWT_SECRET=xxx
railway variables set DEFAULT_TOKENS=100

# Open in browser
railway open
```

## ⚙️ Environment Variables yang Diperlukan

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `GROQ_API_KEY` | API key dari Groq Console | `gsk_...` |
| `MIDTRANS_SERVER_KEY` | Midtrans server key untuk payment | `SB-Mid-server-...` |
| `MIDTRANS_CLIENT_KEY` | Midtrans client key | `SB-Mid-client-...` |
| `JWT_SECRET` | Secret key untuk JWT token | `my_super_secret_key` |
| `DEFAULT_TOKENS` | Token default untuk user baru | `100` |
| `PORT` | Port aplikasi (optional) | `3000` |

## 🔍 Cek Deployment

### Setelah Deploy Berhasil:

1. **Test Endpoint**
   ```bash
   curl https://your-app.up.railway.app
   ```

2. **Cek Logs**
   - Di Railway dashboard → Deployments → View Logs
   - Cari pesan: `✅ KrisAI running at http://localhost:3000`

3. **Test Features**
   - Buka URL Railway di browser
   - Register user baru
   - Test Chat AI
   - Test Top Up page

## 🐛 Troubleshooting

### Issue: App tidak start

**Solusi:**
- Cek logs di Railway dashboard
- Pastikan semua environment variables sudah diset
- Cek `package.json` ada `"start": "node server.js"`

### Issue: Port binding error

**Solusi:**
Railway auto-assign port via `process.env.PORT`. Pastikan `server.js` menggunakan:
```javascript
const PORT = process.env.PORT || 3000;
```

### Issue: Data hilang setelah restart

**Solusi:**
Railway free tier tidak support persistent disk. Untuk production:
1. Upgrade ke Railway Pro ($5/month) + persistent disk
2. Atau migrate ke database (MongoDB/PostgreSQL)

### Issue: API Keys tidak work

**Solusi:**
- Double-check semua environment variables di Railway dashboard
- Restart deployment setelah update variables
- Test API keys secara lokal terlebih dahulu

## 📊 Monitoring

### Railway Dashboard:
- **Deployments**: History deployment
- **Metrics**: CPU, RAM, Network usage
- **Logs**: Real-time application logs

### Free Tier Limits:
- ✅ 500 execution hours/month
- ✅ $5 credit gratis
- ✅ Auto-sleep tidak aktif (always running)
- ❌ Persistent disk tidak gratis

## 🔄 Update & Re-deploy

### Auto-deploy dari GitHub:
```bash
# Push changes
git add .
git commit -m "Update feature X"
git push

# Railway otomatis re-deploy
```

### Manual deploy via CLI:
```bash
railway up
```

## 🎯 Production Checklist

- [ ] Push code ke GitHub repository
- [ ] Setup Railway project
- [ ] Set semua environment variables
- [ ] Generate custom domain
- [ ] Test register & login
- [ ] Test Chat AI feature
- [ ] Test Top Up payment flow
- [ ] Setup monitoring/alerts
- [ ] Backup strategy untuk data files

## 📞 Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- KrisAI Issues: Create issue di GitHub repo

## 🚀 Next Steps

Setelah deploy sukses:
1. Update Midtrans ke production mode
2. Setup custom domain (opsional)
3. Enable analytics/monitoring
4. Backup user data secara berkala

---

**Happy Deploying! 🎉**
