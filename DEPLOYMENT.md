# Istanbul Restaurant - Docker Deployment Guide

هذا الدليل يوضح كيفية نشر مشروع مطعم إسطنبول باستخدام Docker و Nginx.

## 🎯 الإعداد السريع للـ IP الجديد: 5.35.94.240

### 1. استخدام ملف البيئة الجاهز
```bash
# انسخ ملف البيئة المنتج
cp .env.production .env

# أو عدل الملف الموجود
cp .env.example .env
# ثم حدث القيم كما هو موضح أدناه
```

### 2. الإعدادات المطلوبة للـ IP 5.35.94.240
```env
ALLOWED_ORIGINS=http://5.35.94.240,https://5.35.94.240
VITE_API_URL=http://5.35.94.240:3000/api
VITE_SOCKET_URL=http://5.35.94.240:3000
```

### 3. تشغيل التطبيق
```bash
docker-compose up --build -d
```

**سيكون التطبيق متاحاً على: http://5.35.94.240**

## 📋 المتطلبات

- Docker و Docker Compose مثبتين على النظام
- منفذ 80 متاح (للـ frontend)
- منفذ 3000 متاح (للـ backend)
- منفذ 5432 متاح (للـ database)

## 🚀 الخطوات السريعة

### 1. تحضير البيئة
```bash
# انسخ ملف البيئة وعدل القيم
cp .env.example .env

# تأكد من أن Docker يعمل
docker --version
docker-compose --version
```

### 2. بناء وتشغيل التطبيق
```bash
# بناء وتشغيل جميع الخدمات
docker-compose up --build

# أو في الخلفية
docker-compose up --build -d
```

### 3. التحقق من التشغيل
```bash
# فحص حالة الخدمات
docker-compose ps

# عرض السجلات
docker-compose logs

# فحص صحة الخدمات
curl http://localhost/health
curl http://localhost:3000/api/health
```

## 📁 هيكل المشروع

```
Restaurant-Hub/
├── backend/                 # Flask API
│   ├── Dockerfile          # Backend container config
│   ├── requirements.txt    # Python dependencies
│   ├── app.py             # Main Flask app
│   └── .dockerignore      # Docker ignore file
├── client/                # React frontend
│   └── src/               # Source code
├── Dockerfile             # Frontend container config
├── nginx.conf            # Nginx configuration
├── docker-compose.yml    # Services orchestration
├── .env.example          # Environment variables template
└── database.sql          # Database schema
```

## 🔧 الإعدادات المهمة

### متغيرات البيئة (.env)

قم بتحديث الملف `.env` بالقيم الصحيحة:

```env
# قاعدة البيانات
DB_HOST=postgres
DB_NAME=restaurant_db
DB_USER=postgres
DB_PASSWORD=your_secure_password

# التطبيق
SECRET_KEY=your_new_secret_key_here
ALLOWED_ORIGINS=http://yourdomain.com,https://yourdomain.com

# Cloudinary (للإنتاج)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend
VITE_API_URL=https://api.yourdomain.com/api
VITE_SOCKET_URL=https://api.yourdomain.com
```

## 🌐 نشر على خادم (مع IP جديد)

### عند الحصول على IP جديد من موقع الاستضافة:

#### 1. تحديث متغيرات البيئة
```bash
# افتح ملف .env وحدث:
ALLOWED_ORIGINS=https://your-new-ip-or-domain
VITE_API_URL=https://your-new-ip-or-domain/api
VITE_SOCKET_URL=https://your-new-ip-or-domain
```

#### 2. إعداد SSL (مستحسن)
```bash
# استخدم Let's Encrypt أو شهادات SSL
# أو خدمة Cloudflare للـ SSL مجاناً
```

#### 3. تحديث إعدادات Nginx (إذا لزم الأمر)
```nginx
# في nginx.conf، يمكنك إضافة SSL:
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # ... باقي الإعدادات
}
```

#### 4. إعادة بناء وتشغيل
```bash
# إعادة بناء مع التغييرات الجديدة
docker-compose down
docker-compose up --build -d
```

## 🔍 استكشاف الأخطاء

### فحص السجلات
```bash
# سجلات جميع الخدمات
docker-compose logs

# سجلات خدمة معينة
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### فحص قاعدة البيانات
```bash
# الدخول إلى قاعدة البيانات
docker-compose exec postgres psql -U postgres -d restaurant_db

# فحص الجداول
\dt

# فحص المستخدمين
SELECT * FROM users;
```

### إعادة تشغيل الخدمات
```bash
# إعادة تشغيل خدمة معينة
docker-compose restart backend

# إعادة تشغيل جميع الخدمات
docker-compose restart
```

## 🔒 الأمان في الإنتاج

### 1. تغيير كلمات المرور
- غير `DB_PASSWORD` إلى كلمة مرور قوية
- غير `SECRET_KEY` إلى مفتاح جديد

### 2. إعداد HTTPS
- احصل على شهادة SSL
- حدث `ALLOWED_ORIGINS` لتشمل HTTPS فقط

### 3. قاعدة البيانات
- لا تستخدم المنفذ 5432 خارجياً
- استخدم كلمة مرور قوية
- قم بنسخ احتياطي دوري

### 4. Cloudinary
- استخدم حساب Cloudinary منفصل للإنتاج
- حدد حدود الاستخدام

## 📊 مراقبة الأداء

### فحص استخدام الموارد
```bash
# استخدام Docker
docker stats

# حجم الصور
docker images
docker system df
```

### نقاط النهاية للفحص
- Frontend: `http://localhost/health`
- Backend: `http://localhost:3000/api/health`
- Database: `docker-compose exec postgres pg_isready`

## 🛠️ أوامر مفيدة

```bash
# إيقاف جميع الخدمات
docker-compose down

# إزالة الحجمات (تحذير: يحذف البيانات)
docker-compose down -v

# بناء بدون cache
docker-compose build --no-cache

# عرض الموارد المستخدمة
docker stats

# تنظيف النظام
docker system prune -a
```

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من السجلات: `docker-compose logs`
2. تأكد من المنافذ: `netstat -tlnp | grep :80`
3. تحقق من متغيرات البيئة في `.env`
4. تأكد من اتصال قاعدة البيانات

## ✅ قائمة المراجعة قبل النشر

- [ ] نسخ `.env.example` إلى `.env`
- [ ] تحديث جميع كلمات المرور والمفاتيح
- [ ] تحديث `ALLOWED_ORIGINS` و `VITE_API_URL`
- [ ] اختبار `docker-compose up --build`
- [ ] التحقق من الوصول إلى `http://localhost`
- [ ] التحقق من API في `http://localhost:3000/api/health`
- [ ] اختبار وظائف التطبيق
- [ ] إعداد SSL/HTTPS
- [ ] إعداد backup لقاعدة البيانات
