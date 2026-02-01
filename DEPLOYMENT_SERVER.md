# 🚀 دليل نشر مشروع Istanbul Restaurant على السيرفر

## 📋 معلومات السيرفر
- **IP السيرفر**: `5.35.94.240`
- **المستخدم**: `root`
- **المنصة**: DigitalOcean (أو أي VPS)

---

## ✅ المشاكل التي تم حلها

### 1. ❌ مشكلة psycopg في الباك إند
**الخطأ**: `ModuleNotFoundError: No module named 'psycopg'`

**الحل**: 
- تم تحديث `backend/requirements.txt` لتضمين `psycopg[binary,pool]>=3.1.0`
- هذا يضمن تثبيت جميع المكونات المطلوبة

### 2. ❌ مشكلة الاتصال بين Frontend و Backend
**المشكلة**: Frontend يستخدم `localhost` بدلاً من IP السيرفر

**الحل**:
- تم تحديث جميع ملفات `.env` لاستخدام `http://5.35.94.240:3000/api`
- تم تحديث nginx.conf لتوجيه الطلبات بشكل صحيح
- تم تحديث CORS في backend/app.py للسماح بالاتصال من IP السيرفر

---

## 📦 الملفات المحدثة

### 1. Backend Files
- ✅ `backend/requirements.txt` - إصلاح psycopg
- ✅ `backend/app.py` - CORS محدث للسيرفر الجديد
- ✅ `backend/.env` - متغيرات البيئة محدثة

### 2. Frontend Files
- ✅ `Restaurant-Hub/.env` - API URL محدث
- ✅ `Restaurant-Hub/.env.production` - API URL محدث
- ✅ `Restaurant-Hub/Dockerfile` - Build args محدثة
- ✅ `Restaurant-Hub/nginx.conf` - Proxy محدث

### 3. Docker Files
- ✅ `docker-compose.yml` - إعدادات الإنتاج الكاملة
- ✅ `.env.production` - متغيرات البيئة للإنتاج

---

## 🔧 خطوات النشر على السيرفر

### الخطوة 1: الاتصال بالسيرفر
```bash
ssh root@5.35.94.240
```

### الخطوة 2: تثبيت المتطلبات الأساسية
```bash
# تحديث النظام
apt-get update && apt-get upgrade -y

# تثبيت Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# تثبيت Docker Compose
apt-get install docker-compose-plugin -y

# تثبيت Git
apt-get install git -y

# التحقق من التثبيت
docker --version
docker compose version
git --version
```

### الخطوة 3: رفع المشروع للسيرفر

#### الطريقة 1: استخدام Git (موصى بها)
```bash
# على السيرفر
cd /root
git clone https://github.com/mohamedatef010/projectrest.git
cd projectrest
```

#### الطريقة 2: استخدام SCP (من جهازك المحلي)
```bash
# من جهازك المحلي
scp -r c:/Users/moham/projectres root@5.35.94.240:/root/restaurant-app
```

### الخطوة 4: إعداد ملفات البيئة
```bash
# على السيرفر
cd /root/projectrest  # أو /root/restaurant-app

# نسخ ملف البيئة للإنتاج
cp .env.production .env

# التحقق من المحتوى
cat .env
```

### الخطوة 5: بناء وتشغيل Docker Containers
```bash
# إيقاف أي containers قديمة
docker compose down -v

# بناء الصور
docker compose build --no-cache

# تشغيل الخدمات
docker compose up -d

# متابعة السجلات
docker compose logs -f
```

### الخطوة 6: التحقق من التشغيل
```bash
# التحقق من الـ containers
docker compose ps

# يجب أن ترى:
# - restaurant-postgres (running)
# - restaurant-backend (running)
# - restaurant-frontend (running)

# اختبار Backend API
curl http://localhost:3000/api/health

# اختبار Frontend
curl http://localhost:80
```

### الخطوة 7: إعداد قاعدة البيانات
```bash
# الدخول إلى container الباك إند
docker exec -it restaurant-backend bash

# تشغيل سكريبت قاعدة البيانات (إذا كان موجوداً)
# أو استخدم psql مباشرة

# الخروج من container
exit

# أو استخدم psql مباشرة من السيرفر
docker exec -i restaurant-postgres psql -U postgres -d restaurant_db < Restaurant-Hub/database.sql
```

---

## 🌐 الوصول للتطبيق

بعد النشر الناجح:

### Frontend (واجهة المستخدم)
```
http://5.35.94.240
```

### Backend API
```
http://5.35.94.240:3000/api
```

### API Endpoints للاختبار
```bash
# Health Check
curl http://5.35.94.240:3000/api/health

# Test Database
curl http://5.35.94.240:3000/api/test-db

# Get Categories
curl http://5.35.94.240:3000/api/categories

# Get Menu Items
curl http://5.35.94.240:3000/api/menu-items
```

### تسجيل الدخول للوحة التحكم
```
URL: http://5.35.94.240/login
Email: admin@istanbul.ru
Password: admin123
```

---

## 🔍 استكشاف الأخطاء

### مشكلة: Backend لا يعمل
```bash
# عرض سجلات Backend
docker compose logs backend

# إعادة تشغيل Backend
docker compose restart backend

# الدخول إلى container للتحقق
docker exec -it restaurant-backend bash
python -c "import psycopg; print('psycopg OK')"
```

### مشكلة: Frontend لا يتصل بـ Backend
```bash
# التحقق من nginx logs
docker compose logs frontend

# التحقق من nginx config
docker exec restaurant-frontend cat /etc/nginx/nginx.conf

# اختبار الاتصال من Frontend إلى Backend
docker exec restaurant-frontend curl http://backend:3000/api/health
```

### مشكلة: Database Connection Failed
```bash
# التحقق من PostgreSQL
docker compose logs postgres

# اختبار الاتصال
docker exec restaurant-postgres psql -U postgres -d restaurant_db -c "SELECT version();"

# إعادة إنشاء Database
docker compose down -v
docker compose up -d postgres
# انتظر 10 ثواني
docker compose up -d backend frontend
```

### مشكلة: CORS Errors
```bash
# التحقق من CORS settings في Backend
docker exec restaurant-backend cat /app/app.py | grep -A 10 "CORS"

# إعادة بناء Backend مع التحديثات
docker compose build backend --no-cache
docker compose up -d backend
```

---

## 🔄 تحديث التطبيق

عند إجراء تغييرات على الكود:

```bash
# على السيرفر
cd /root/projectrest

# سحب آخر التحديثات (إذا كنت تستخدم Git)
git pull origin main

# إعادة بناء وتشغيل
docker compose down
docker compose build --no-cache
docker compose up -d

# متابعة السجلات
docker compose logs -f
```

---

## 🛡️ إعدادات الأمان (موصى بها)

### 1. إعداد Firewall
```bash
# تثبيت UFW
apt-get install ufw -y

# السماح بـ SSH
ufw allow 22/tcp

# السماح بـ HTTP
ufw allow 80/tcp

# السماح بـ HTTPS (للمستقبل)
ufw allow 443/tcp

# تفعيل Firewall
ufw enable

# التحقق من الحالة
ufw status
```

### 2. تغيير كلمات المرور
```bash
# تحديث .env مع كلمات مرور قوية
nano .env

# تغيير:
# - DB_PASSWORD
# - SECRET_KEY
```

### 3. إعداد SSL (اختياري - للمستقبل)
```bash
# تثبيت Certbot
apt-get install certbot python3-certbot-nginx -y

# الحصول على شهادة SSL (يتطلب domain name)
# certbot --nginx -d yourdomain.com
```

---

## 📊 مراقبة التطبيق

### عرض حالة الخدمات
```bash
# حالة جميع الـ containers
docker compose ps

# استخدام الموارد
docker stats

# مساحة القرص
df -h
```

### عرض السجلات
```bash
# جميع السجلات
docker compose logs

# سجلات خدمة معينة
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# متابعة السجلات الحية
docker compose logs -f --tail=100
```

### النسخ الاحتياطي لقاعدة البيانات
```bash
# إنشاء نسخة احتياطية
docker exec restaurant-postgres pg_dump -U postgres restaurant_db > backup_$(date +%Y%m%d_%H%M%S).sql

# استعادة من نسخة احتياطية
docker exec -i restaurant-postgres psql -U postgres restaurant_db < backup_20260201_050000.sql
```

---

## 📝 ملاحظات مهمة

1. ✅ **جميع الروابط محدثة**: تم تحديث جميع الروابط من `localhost` إلى `5.35.94.240`

2. ✅ **CORS مضبوط**: Backend يسمح بالاتصال من IP السيرفر

3. ✅ **Nginx Proxy**: يوجه الطلبات بشكل صحيح من Frontend إلى Backend

4. ✅ **WebSocket**: مدعوم للتحديثات الفورية

5. ✅ **Health Checks**: جميع الخدمات لديها health checks

6. ⚠️ **Database Password**: تأكد من تغيير كلمة مرور قاعدة البيانات في الإنتاج

7. ⚠️ **Cloudinary**: تأكد من صحة بيانات Cloudinary API

---

## 🆘 الدعم

إذا واجهت أي مشاكل:

1. تحقق من السجلات: `docker compose logs -f`
2. تحقق من حالة الخدمات: `docker compose ps`
3. أعد تشغيل الخدمات: `docker compose restart`
4. أعد البناء من الصفر: `docker compose down -v && docker compose up -d --build`

---

## ✅ قائمة التحقق النهائية

- [ ] تم الاتصال بالسيرفر بنجاح
- [ ] تم تثبيت Docker و Docker Compose
- [ ] تم رفع المشروع للسيرفر
- [ ] تم تحديث ملفات .env
- [ ] تم بناء Docker images بنجاح
- [ ] جميع الـ containers تعمل (postgres, backend, frontend)
- [ ] Backend API يستجيب على http://5.35.94.240:3000/api/health
- [ ] Frontend يعمل على http://5.35.94.240
- [ ] يمكن تسجيل الدخول بنجاح
- [ ] يمكن إضافة/تعديل/حذف البيانات
- [ ] الصور تُرفع بنجاح إلى Cloudinary

---

## 🎉 تم بنجاح!

الآن تطبيقك يعمل على السيرفر `5.35.94.240` وجاهز للاستخدام!

**روابط الوصول:**
- Frontend: http://5.35.94.240
- Backend API: http://5.35.94.240:3000/api
- Admin Login: http://5.35.94.240/login (admin@istanbul.ru / admin123)
