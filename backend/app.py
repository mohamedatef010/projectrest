import os
import json
from datetime import datetime
from decimal import Decimal
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
try:
    from werkzeug.middleware.proxy_fix import ProxyFix
    _proxy_fix_available = True
except ImportError:
    _proxy_fix_available = False
from flask_login import (
    LoginManager, 
    UserMixin, 
    login_user, 
    logout_user, 
    login_required, 
    current_user
)
import psycopg2
from psycopg2 import pool
import psycopg2.errors
from psycopg2.extras import RealDictCursor, DictRow
import bcrypt
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
import traceback
from flask_socketio import SocketIO, emit

load_dotenv()

app = Flask(__name__)
# ✅ ضروري خلف nginx: حتى تعمل الجلسة والكوكيز بشكل صحيح (اختياري إذا لم يكن ProxyFix متوفراً)
if _proxy_fix_available:
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# ✅ CORS: قراءة من متغير البيئة أو استخدام القائمة الافتراضية (تشمل السيرفر على البورت 80)
_default_origins = [
    "http://5.35.94.240",
    "http://5.35.94.240:80",
    "http://5.35.94.240:3000",
    "http://5.35.94.240:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://resturant-front-io2a-ngxxzmw7t-mohamedatef010s-projects.vercel.app",
    "https://resturant-front-io2a.vercel.app",
]
_env_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = _default_origins + [o.strip() for o in _env_origins.split(",") if o.strip()]
allowed_origins = list(dict.fromkeys(allowed_origins))  # بدون تكرار

server_ip = os.getenv("SERVER_IP", "5.35.94.240")

CORS(app, 
     supports_credentials=True,
     origins=allowed_origins,
     allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
     expose_headers=["Content-Type", "Authorization"],
     max_age=3600
)

@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    origin = request.headers.get('Origin')
    if origin and origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# ✅ إعدادات Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME', 'dsqa2mswb'),
    api_key=os.getenv('CLOUDINARY_API_KEY', '832358722769939'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET', 'ZBe2tnu-a8GXln84kBAoRXk-y0Y'),
    secure=True
)

app.config.update(
    SECRET_KEY=os.getenv('SECRET_KEY', 'istanbul-restaurant-secret-2024'),
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=86400  # 24 hours
)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# ✅ إعداد WebSocket مع عنوان السيرفر الجديد
socketio = SocketIO(app, 
                    cors_allowed_origins=allowed_origins,
                    async_mode='threading',
                    ping_timeout=60,
                    ping_interval=25,
                    logger=True,
                    engineio_logger=True)

# ✅ تهيئة connection pool
db_pool = None

def init_db_pool():
    global db_pool
    try:
        # استخدام SimpleConnectionPool من psycopg2
        db_pool = psycopg2.pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            host=os.getenv("DB_HOST", "restaurant-postgres"),
            port=int(os.getenv("DB_PORT", "5432")),
            database=os.getenv("DB_NAME", "restaurant_db"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "0196470893mOm")
        )
        print("✅ Database pool initialized successfully with psycopg2")

        # اختبار الاتصال
        conn = db_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                version = cur.fetchone()
                print(f"📊 PostgreSQL Version: {version[0]}")
        finally:
            db_pool.putconn(conn)

    except Exception as e:
        print(f"❌ Error initializing database pool: {e}")
        traceback.print_exc()
        db_pool = None


def get_db_connection():
    """Get a database connection from pool"""
    global db_pool

    if db_pool is None:
        init_db_pool()

    if db_pool is None:
        raise RuntimeError("Database pool is not initialized")

    try:
        conn = db_pool.getconn()
        if conn and not conn.closed:
            # ✅ إضافة هذا السطر لحل مشكلة الترميز
            conn.set_client_encoding('UTF8')
        return conn
    except Exception as e:
        print(f"❌ Failed to get database connection: {e}")
        traceback.print_exc()
        raise


def return_db_connection(conn):
    """Return connection to pool"""
    global db_pool

    try:
        if conn and not conn.closed and db_pool:
            db_pool.putconn(conn)
    except Exception as e:
        print(f"⚠️ Error returning connection to pool: {e}")
        try:
            conn.close()
        except Exception:
            pass

class User(UserMixin):
    def __init__(self, id, email, first_name, last_name, is_admin=False):
        self.id = id
        self.email = email
        self.first_name = first_name
        self.last_name = last_name
        self.is_admin = is_admin

@login_manager.user_loader
def load_user(user_id):
    """Load user from database"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, email, first_name, last_name, is_admin 
                FROM users WHERE id = %s
            """, (user_id,))
            user_data = cur.fetchone()
            if user_data:
                return User(
                    id=user_data['id'],
                    email=user_data['email'],
                    first_name=user_data['first_name'],
                    last_name=user_data['last_name'],
                    is_admin=user_data['is_admin']
                )
    except Exception as e:
        print(f"❌ Error loading user: {e}")
        return None
    finally:
        if conn:
            return_db_connection(conn)
    return None

def admin_required(f):
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin:
            return jsonify({
                'success': False,
                'error': 'Unauthorized: Admin access required'
            }), 401
        return f(*args, **kwargs)
    return decorated_function

def upload_to_cloudinary(file, folder="istanbul_restaurant"):
    """Upload file to Cloudinary"""
    try:
        if not file or not hasattr(file, 'filename') or file.filename == '':
            raise ValueError("No valid file provided")
        
        upload_result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="image",
            quality="auto",
            fetch_format="auto"
        )
        return {
            'url': upload_result['secure_url'],
            'public_id': upload_result['public_id']
        }
    except Exception as e:
        print(f"❌ Cloudinary upload error: {e}")
        raise Exception(f"Failed to upload image: {str(e)}")

def delete_from_cloudinary(public_id):
    """Delete file from Cloudinary"""
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result.get('result') == 'ok'
    except Exception as e:
        print(f"❌ Cloudinary delete error: {e}")
        return False

# ==================== دالة مساعدة لتحويل البيانات ====================

def convert_to_json_serializable(data):
    """Convert database result to JSON serializable format"""
    if data is None:
        return None
    
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            result[key] = convert_to_json_serializable(value)
        return result
    elif isinstance(data, list):
        return [convert_to_json_serializable(item) for item in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, Decimal):
        return float(data)
    elif hasattr(data, '__dict__'):
        return convert_to_json_serializable(data.__dict__)
    else:
        return data

def safe_socket_emit(event_type, data, action='create'):
    """Safely emit WebSocket events with serializable data"""
    try:
        serializable_data = convert_to_json_serializable(data)
        socketio.emit('data_update', {
            'type': event_type,
            'action': action,
            'data': serializable_data,
            'timestamp': datetime.now().isoformat()
        })
        return True
    except Exception as e:
        print(f"⚠️ WebSocket emit error: {e}")
        return False

# ==================== Routes ====================

@app.route('/api/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({
        'success': True,
        'message': 'API is working',
        'timestamp': datetime.now().isoformat(),
        'service': 'Istanbul Restaurant API',
        'server_ip': server_ip
    })

@app.route('/api/test-db', methods=['GET'])
def test_db():
    """Test database connection"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT NOW() as time, version() as version")
            result = cur.fetchone()
            return jsonify({
                'success': True,
                'time': str(result['time']),
                'version': result['version']
            })
    except Exception as e:
        print(f"❌ Database test error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            return_db_connection(conn)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for proxy"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Istanbul Restaurant API',
        'version': '1.0.0',
        'server_ip': server_ip,
        'backend_port': 3000,
        'database_connected': db_pool is not None
    })

# ==================== Authentication Routes ====================

@app.route('/api/login', methods=['GET'])
def login_page():
    """Check if user is logged in"""
    if current_user.is_authenticated:
        return jsonify({
            'success': True,
            'user': {
                'id': current_user.id,
                'email': current_user.email,
                'first_name': current_user.first_name,
                'last_name': current_user.last_name,
                'is_admin': current_user.is_admin
            }
        })
    return jsonify({
        'success': False,
        'message': 'Not logged in'
    })

@app.route('/api/login', methods=['POST'])
def login():
    """Login endpoint - بدون تشفير"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
            
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                user_data = cur.fetchone()
                
                if not user_data:
                    return jsonify({
                        'success': False,
                        'message': 'Invalid email or password'
                    }), 401
                
                # ✅ دعم أسماء الأعمدة بأحرف صغيرة (PostgreSQL) أو مختلفة
                row = dict(user_data)
                stored_password = row.get('password')
                
                if stored_password is None or stored_password != password:
                    if stored_password == '$2b$12$X8U2vQ5k7z6W9a8b7c6d5e' and password == 'admin123':
                        print("⚠️ Using hardcoded password match for compatibility")
                    else:
                        return jsonify({
                            'success': False,
                            'message': 'Invalid email or password'
                        }), 401
                
                # ✅ تحويل is_admin إلى bool (PostgreSQL قد يرجع True/False أو t/f)
                is_admin = row.get('is_admin', False)
                if isinstance(is_admin, str):
                    is_admin = is_admin.lower() in ('true', 't', '1', 'yes')
                user = User(
                    id=int(row.get('id', 0)),
                    email=str(row.get('email', '')),
                    first_name=row.get('first_name') or '',
                    last_name=row.get('last_name') or '',
                    is_admin=bool(is_admin)
                )
                
                # ✅ تسجيل دخول المستخدم
                login_user(user, remember=True)
                
                return jsonify({
                    'success': True,
                    'message': 'Login successful',
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'is_admin': user.is_admin
                    }
                })
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': 'Internal server error'
            }), 500
        finally:
            if conn:
                return_db_connection(conn)
                
    except Exception as e:
        print(f"❌ Login endpoint error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

@app.route('/api/reset-admin-password', methods=['POST'])
def reset_admin_password():
    """Reset admin password to admin123"""
    try:
        data = request.get_json() or {}
        new_password = data.get('password', 'admin123')
        
        # Hash the new password
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if user exists
                cur.execute("SELECT id FROM users WHERE email = 'admin@istanbul.ru'")
                user = cur.fetchone()
                
                if not user:
                    # Create user if doesn't exist
                    cur.execute("""
                        INSERT INTO users (email, password, first_name, last_name, is_admin) 
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        'admin@istanbul.ru',
                        hashed_password,
                        'Admin',
                        'User',
                        True
                    ))
                else:
                    # Update existing user
                    cur.execute("""
                        UPDATE users 
                        SET password = %s 
                        WHERE email = 'admin@istanbul.ru'
                    """, (hashed_password,))
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': f'Password reset successfully for admin@istanbul.ru',
                    'new_password': new_password,
                    'hashed_password_preview': hashed_password[:30] + '...'
                })
                
        except Exception as e:
            print(f"❌ Error resetting password: {e}")
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        finally:
            if conn:
                return_db_connection(conn)
                
    except Exception as e:
        print(f"❌ Reset password error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    """Logout endpoint"""
    try:
        logout_user()
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        })
    except Exception as e:
        print(f"❌ Logout error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/auth/user', methods=['GET'])
def get_auth_user():
    """Get current authenticated user"""
    try:
        if current_user.is_authenticated:
            return jsonify({
                'success': True,
                'user': {
                    'id': current_user.id,
                    'email': current_user.email,
                    'first_name': current_user.first_name,
                    'last_name': current_user.last_name,
                    'is_admin': current_user.is_admin
                }
            })
        return jsonify({
            'success': False,
            'message': 'Not authenticated'
        })
    except Exception as e:
        print(f"❌ Error in get_auth_user: {e}")
        return jsonify({
            'success': False,
            'message': 'Not authenticated'
        })

# ==================== Categories Routes ====================

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all categories"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    id,
                    name,
                    description,
                    order_index as "orderIndex",
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                FROM categories 
                ORDER BY order_index, id
            """)
            categories = cur.fetchall()
            print(f"📊 Retrieved {len(categories)} categories from database")
            return jsonify({
                'success': True,
                'data': categories
            })
    except Exception as e:
        print(f"❌ Error fetching categories: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
    finally:
        if conn:
            return_db_connection(conn)

@app.route('/api/categories', methods=['POST'])
@admin_required
def create_category():
    """Create a new category"""
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({
                'success': False,
                'error': 'Category name is required'
            }), 400
        
        print(f"📥 Creating category: {data.get('name')}")
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO categories (name, description, order_index)
                    VALUES (%s, %s, %s)
                    RETURNING 
                        id,
                        name,
                        description,
                        order_index as "orderIndex",
                        created_at as "createdAt",
                        updated_at as "updatedAt"
                """, (
                    data.get('name'),
                    data.get('description', ''),
                    data.get('orderIndex', 0)
                ))
                
                category = cur.fetchone()
                conn.commit()
                
                print(f"✅ Category created: {category['name']}")
                
                # ✅ إرسال إشعار تحديث فوري
                safe_socket_emit('category_created', category, 'create')
                
                return jsonify({
                    'success': True,
                    'data': category
                }), 201
                
        except Exception as e:
            print(f"❌ Error creating category: {e}")
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        finally:
            if conn:
                return_db_connection(conn)
                
    except Exception as e:
        print(f"❌ Create category error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/api/categories/<int:id>', methods=['PUT'])
@admin_required
def update_category(id):
    """Update a category"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        print(f"📥 Updating category {id} with data: {data}")
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # خريطة بين أسماء frontend وأسماء أعمدة قاعدة البيانات
                field_mapping = {
                    'name': 'name',
                    'description': 'description',
                    'orderIndex': 'order_index'
                }
                
                update_fields = []
                values = []
                
                for frontend_field, db_field in field_mapping.items():
                    if frontend_field in data:
                        update_fields.append(f"{db_field} = %s")
                        values.append(data[frontend_field])
                
                if not update_fields:
                    return jsonify({
                        'success': False,
                        'error': 'No fields to update'
                    }), 400
                
                values.append(id)
                
                query = f"""
                    UPDATE categories 
                    SET {', '.join(update_fields)}, updated_at = NOW()
                    WHERE id = %s 
                    RETURNING 
                        id,
                        name,
                        description,
                        order_index as "orderIndex",
                        created_at as "createdAt",
                        updated_at as "updatedAt"
                """
                
                cur.execute(query, values)
                category = cur.fetchone()
                conn.commit()
                
                if not category:
                    return jsonify({
                        'success': False,
                        'error': 'Category not found'
                    }), 404
                
                print(f"✅ Category updated: {category['name']}")
                
                # ✅ إرسال إشعار تحديث فوري
                safe_socket_emit('category_updated', category, 'update')
                
                return jsonify({
                    'success': True,
                    'data': category
                })
                
        except Exception as e:
            print(f"❌ Error updating category: {e}")
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        finally:
            if conn:
                return_db_connection(conn)
                
    except Exception as e:
        print(f"❌ Update category error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/api/categories/<int:id>', methods=['DELETE'])
@admin_required
def delete_category(id):
    """Delete a category"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # جلب بيانات الفئة قبل الحذف
            cur.execute("SELECT name FROM categories WHERE id = %s", (id,))
            category = cur.fetchone()
            
            if not category:
                return jsonify({
                    'success': False,
                    'error': 'Category not found'
                }), 404
            
            # التحقق مما إذا كانت الفئة تحتوي على عناصر
            cur.execute("SELECT COUNT(*) FROM menu_items WHERE category_id = %s", (id,))
            item_count = cur.fetchone()['count']
            
            if item_count > 0:
                return jsonify({
                    'success': False,
                    'error': f'Cannot delete category with {item_count} menu items. Move items to another category first.'
                }), 400
            
            # حذف الفئة
            cur.execute("DELETE FROM categories WHERE id = %s RETURNING id", (id,))
            deleted = cur.fetchone()
            conn.commit()
            
            if deleted:
                print(f"✅ Category deleted: {category['name']}")
                
                # ✅ إرسال إشعار تحديث فوري
                safe_socket_emit('category_deleted', {'id': id, 'name': category['name']}, 'delete')
                
                return jsonify({
                    'success': True,
                    'message': 'Category deleted successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to delete category'
                }), 500
                
    except Exception as e:
        print(f"❌ Error deleting category: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            return_db_connection(conn)

# ==================== Menu Items Routes ====================

@app.route('/api/menu-items', methods=['GET'])
def get_menu_items():
    """Get all menu items"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    mi.id,
                    mi.name,
                    mi.description,
                    mi.details,
                    mi.price,
                    mi.original_price as "originalPrice",
                    mi.category_id as "categoryId",
                    COALESCE(mi.is_available, true) as "isAvailable",
                    mi.is_featured as "isFeatured",
                    mi.has_discount as "hasDiscount",
                    mi.discount_percentage as "discountPercentage",
                    mi.image_url as "imageUrl",
                    mi.created_at as "createdAt",
                    mi.updated_at as "updatedAt"
                FROM menu_items mi
                ORDER BY mi.created_at DESC
            """)
            items = cur.fetchall()
            
            # تحويل القيم المنطقية
            for item in items:
                item['isAvailable'] = bool(item['isAvailable']) if item['isAvailable'] is not None else True
                item['isFeatured'] = bool(item['isFeatured']) if item['isFeatured'] is not None else False
                item['hasDiscount'] = bool(item['hasDiscount']) if item['hasDiscount'] is not None else False
                item['price'] = int(item['price']) if item['price'] is not None else 0
                item['originalPrice'] = int(item['originalPrice']) if item['originalPrice'] is not None else 0
                item['discountPercentage'] = float(item['discountPercentage']) if item['discountPercentage'] is not None else 0
            
            return jsonify({
                'success': True,
                'data': items
            })
    except Exception as e:
        print(f"❌ Error fetching menu items: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
    finally:
        if conn:
            return_db_connection(conn)

@app.route('/api/menu-items/featured', methods=['GET'])
def get_featured_items():
    """Get featured menu items"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    id,
                    name,
                    description,
                    details,
                    price,
                    original_price as "originalPrice",
                    category_id as "categoryId",
                    is_available as "isAvailable",
                    is_featured as "isFeatured",
                    has_discount as "hasDiscount",
                    discount_percentage as "discountPercentage",
                    image_url as "imageUrl",
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                FROM menu_items 
                WHERE is_featured = true AND is_available = true 
                ORDER BY created_at DESC
            """)
            items = cur.fetchall()
            return jsonify({
                'success': True,
                'data': items
            })
    except Exception as e:
        print(f"❌ Error fetching featured items: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
    finally:
        if conn:
            return_db_connection(conn)

@app.route('/api/menu-items', methods=['POST'])
@admin_required
def create_menu_item():
    """Create a new menu item"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        required_fields = ['name', 'price', 'categoryId']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'{field} is required'
                }), 400
        
        print(f"📥 Creating menu item with data: {data}")
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO menu_items (
                        name, description, details, price, original_price,
                        category_id, is_available, is_featured, has_discount,
                        discount_percentage, image_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING 
                        id,
                        name,
                        description,
                        details,
                        price,
                        original_price as "originalPrice",
                        category_id as "categoryId",
                        is_available as "isAvailable",
                        is_featured as "isFeatured",
                        has_discount as "hasDiscount",
                        discount_percentage as "discountPercentage",
                        image_url as "imageUrl",
                        created_at as "createdAt",
                        updated_at as "updatedAt"
                """, (
                    data.get('name'),
                    data.get('description', ''),
                    data.get('details', ''),
                    data.get('price', 0),
                    data.get('originalPrice', 0),
                    data.get('categoryId'),
                    data.get('isAvailable', True),
                    data.get('isFeatured', False),
                    data.get('hasDiscount', False),
                    data.get('discountPercentage', 0),
                    data.get('imageUrl', '')
                ))
                
                menu_item = cur.fetchone()
                conn.commit()
                
                print(f"✅ Menu item created successfully: {menu_item['name']}")
                
                # ✅ إرسال إشعار تحديث فوري
                safe_socket_emit('menu_item_created', menu_item, 'create')
                
                return jsonify({
                    'success': True,
                    'data': menu_item
                }), 201
                
        except Exception as e:
            print(f"❌ Error creating menu item: {e}")
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        finally:
            if conn:
                return_db_connection(conn)
                
    except Exception as e:
        print(f"❌ Create menu item error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/api/menu-items/<int:id>', methods=['PUT'])
@admin_required
def update_menu_item(id):
    """Update a menu item"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        print(f"📥 Updating menu item {id} with data: {data}")
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # خريطة بين أسماء frontend وأسماء أعمدة قاعدة البيانات
                field_mapping = {
                    'name': 'name',
                    'description': 'description',
                    'details': 'details',
                    'price': 'price',
                    'originalPrice': 'original_price',
                    'categoryId': 'category_id',
                    'isAvailable': 'is_available',
                    'isFeatured': 'is_featured',
                    'hasDiscount': 'has_discount',
                    'discountPercentage': 'discount_percentage',
                    'imageUrl': 'image_url'
                }
                
                update_fields = []
                values = []
                
                for frontend_field, db_field in field_mapping.items():
                    if frontend_field in data:
                        update_fields.append(f"{db_field} = %s")
                        values.append(data[frontend_field])
                
                if not update_fields:
                    return jsonify({
                        'success': False,
                        'error': 'No fields to update'
                    }), 400
                
                values.append(id)
                
                query = f"""
                    UPDATE menu_items 
                    SET {', '.join(update_fields)}, updated_at = NOW()
                    WHERE id = %s 
                    RETURNING 
                        id,
                        name,
                        description,
                        details,
                        price,
                        original_price as "originalPrice",
                        category_id as "categoryId",
                        is_available as "isAvailable",
                        is_featured as "isFeatured",
                        has_discount as "hasDiscount",
                        discount_percentage as "discountPercentage",
                        image_url as "imageUrl",
                        created_at as "createdAt",
                        updated_at as "updatedAt"
                """
                
                cur.execute(query, values)
                updated_item = cur.fetchone()
                conn.commit()
                
                if not updated_item:
                    return jsonify({
                        'success': False,
                        'error': 'Menu item not found'
                    }), 404
                
                print(f"✅ Menu item updated successfully: {updated_item['name']}")
                
                # ✅ إرسال إشعار تحديث فوري
                safe_socket_emit('menu_item_updated', updated_item, 'update')
                
                return jsonify({
                    'success': True,
                    'data': updated_item
                })
                
        except Exception as e:
            print(f"❌ Error updating menu item: {e}")
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        finally:
            if conn:
                return_db_connection(conn)
                
    except Exception as e:
        print(f"❌ Update menu item error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/api/menu-items/<int:id>', methods=['DELETE'])
@admin_required
def delete_menu_item(id):
    """Delete a menu item"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # جلب بيانات العنصر قبل الحذف
            cur.execute("""
                SELECT name FROM menu_items WHERE id = %s
            """, (id,))
            item = cur.fetchone()
            
            if not item:
                return jsonify({
                    'success': False,
                    'error': 'Menu item not found'
                }), 404
            
            # حذف العنصر
            cur.execute("DELETE FROM menu_items WHERE id = %s RETURNING id", (id,))
            deleted = cur.fetchone()
            conn.commit()
            
            if deleted:
                print(f"✅ Menu item deleted: {id}")
                
                # ✅ إرسال إشعار تحديث فوري
                safe_socket_emit('menu_item_deleted', {'id': id, 'name': item['name']}, 'delete')
                
                return jsonify({
                    'success': True,
                    'message': 'Menu item deleted successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to delete menu item'
                }), 500
                
    except Exception as e:
        print(f"❌ Error deleting menu item: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            return_db_connection(conn)

@app.route('/api/create-admin', methods=['POST'])
def create_admin():
    """Create admin user (for testing)"""
    try:
        # Hash password for admin123
        hashed_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Delete existing admin
                cur.execute("DELETE FROM users WHERE email = 'admin@istanbul.ru'")
                
                # Insert new admin
                cur.execute("""
                    INSERT INTO users (email, password, first_name, last_name, is_admin) 
                    VALUES (%s, %s, %s, %s, %s) 
                    RETURNING id, email, first_name, last_name, is_admin
                """, (
                    'admin@istanbul.ru',
                    hashed_password,
                    'Admin',
                    'User',
                    True
                ))
                
                user = cur.fetchone()
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Admin user created successfully',
                    'user': user
                })
                
        except Exception as e:
            print(f"❌ Error creating admin: {e}")
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        finally:
            if conn:
                return_db_connection(conn)
                
    except Exception as e:
        print(f"❌ Create admin error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

# ==================== Contact Info Routes ====================

@app.route('/api/contact-info', methods=['GET'])
def get_contact_info():
    """Get contact information"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM contact_info ORDER BY id DESC LIMIT 1")
            contact = cur.fetchone()
            
            print(f"📊 Database query result: {contact}")
            
            if not contact:
                print("⚠️ No contact info found in database")
                return jsonify({
                    'success': True,
                    'data': {
                        'phone': '',
                        'address': '',
                        'email': '',
                        'openingHours': '',
                        'mondayHours': '',
                        'tuesdayHours': '',
                        'wednesdayHours': '',
                        'thursdayHours': '',
                        'fridayHours': '',
                        'saturdayHours': '',
                        'sundayHours': '',
                        'whatsapp': '',
                        'telegram': '',
                        'max': '',
                        'mapEmbedUrl': '',
                        'socialLinks': {'facebook': '', 'instagram': '', 'vk': '', 'mailru': '', 'ozon': ''}
                    }
                })
            
            # Parse JSON fields
            if contact.get('social_links'):
                try:
                    if isinstance(contact['social_links'], str):
                        contact['social_links'] = json.loads(contact['social_links'])
                except:
                    contact['social_links'] = {'facebook': '', 'instagram': '', 'vk': '', 'mailru': '', 'ozon': ''}
            else:
                contact['social_links'] = {'facebook': '', 'instagram': '', 'vk': '', 'mailru': '', 'ozon': ''}
            
            # ✅ إعادة تسمية الحقول لتناسب Frontend
            response_data = {
                'phone': contact.get('phone', ''),
                'address': contact.get('address', ''),
                'email': contact.get('email', ''),
                'openingHours': contact.get('opening_hours', ''),
                'mondayHours': contact.get('monday_hours', ''),
                'tuesdayHours': contact.get('tuesday_hours', ''),
                'wednesdayHours': contact.get('wednesday_hours', ''),
                'thursdayHours': contact.get('thursday_hours', ''),
                'fridayHours': contact.get('friday_hours', ''),
                'saturdayHours': contact.get('saturday_hours', ''),
                'sundayHours': contact.get('sunday_hours', ''),
                'whatsapp': contact.get('whatsapp', ''),
                'telegram': contact.get('telegram', ''),
                'max': contact.get('max', ''),
                'mapEmbedUrl': contact.get('map_embed_url', ''),
                'socialLinks': contact.get('social_links', {'facebook': '', 'instagram': '', 'vk': '', 'mailru': '', 'ozon': ''})
            }
            
            print(f"✅ Sending contact info: {response_data}")
            
            return jsonify({
                'success': True,
                'data': response_data
            })
    except Exception as e:
        print(f"❌ Error fetching contact info: {e}")
        traceback.print_exc()
        return jsonify({
            'success': True,
            'data': {
                'phone': '',
                'address': '',
                'email': '',
                'openingHours': '',
                'mondayHours': '',
                'tuesdayHours': '',
                'wednesdayHours': '',
                'thursdayHours': '',
                'fridayHours': '',
                'saturdayHours': '',
                'sundayHours': '',
                'whatsapp': '',
                'telegram': '',
                'max': '',
                'mapEmbedUrl': '',
                'socialLinks': {'facebook': '', 'instagram': '', 'vk': '', 'mailru': '', 'ozon': ''}
            }
        })
    finally:
        if conn:
            return_db_connection(conn)

@app.route('/api/contact-info', methods=['PUT', 'POST'])
@admin_required
def update_contact_info():
    """Update contact information - accepts both PUT and POST"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        print(f"📥 Received update data via {request.method}: {data}")
        
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if contact info exists
                cur.execute("SELECT id FROM contact_info LIMIT 1")
                existing = cur.fetchone()
                
                print(f"📊 Existing record: {existing}")
                
                # ✅ معالجة social_links بشكل صحيح مع الحقول الجديدة
                social_links = data.get('social_links', data.get('socialLinks', {}))
                print(f"🔧 Raw social_links from request: {social_links} (type: {type(social_links)})")
                
                if isinstance(social_links, str):
                    try:
                        social_links = json.loads(social_links)
                        print(f"✅ Parsed social_links from string: {social_links}")
                    except:
                        print(f"❌ Failed to parse social_links JSON")
                        social_links = {}
                elif not isinstance(social_links, dict):
                    print(f"⚠️ social_links is not dict, type: {type(social_links)}")
                    social_links = {}
                
                # تأكد من أن social_links يحتوي على جميع الحقول
                social_links = {
                    'facebook': social_links.get('facebook', ''),
                    'instagram': social_links.get('instagram', ''),
                    'vk': social_links.get('vk', ''),
                    'mailru': social_links.get('mailru', ''),
                    'ozon': social_links.get('ozon', '')
                }
                
                print(f"📤 Final social_links to save: {social_links}")
                
                # الحصول على البيانات
                phone = data.get('phone') or ''
                address = data.get('address') or ''
                email = data.get('email') or ''
                opening_hours = data.get('opening_hours') or data.get('openingHours') or ''
                monday_hours = data.get('monday_hours') or data.get('mondayHours') or ''
                tuesday_hours = data.get('tuesday_hours') or data.get('tuesdayHours') or ''
                wednesday_hours = data.get('wednesday_hours') or data.get('wednesdayHours') or ''
                thursday_hours = data.get('thursday_hours') or data.get('thursdayHours') or ''
                friday_hours = data.get('friday_hours') or data.get('fridayHours') or ''
                saturday_hours = data.get('saturday_hours') or data.get('saturdayHours') or ''
                sunday_hours = data.get('sunday_hours') or data.get('sundayHours') or ''
                whatsapp = data.get('whatsapp') or ''
                telegram = data.get('telegram') or ''
                max_app = data.get('max') or ''
                map_embed_url = data.get('map_embed_url') or data.get('mapEmbedUrl') or ''
                
                if existing:
                    # Update existing
                    print(f"🔄 Updating existing record ID: {existing['id']}")
                    cur.execute("""
                        UPDATE contact_info 
                        SET phone = %s, address = %s, email = %s, 
                            opening_hours = %s,
                            monday_hours = %s,
                            tuesday_hours = %s,
                            wednesday_hours = %s,
                            thursday_hours = %s,
                            friday_hours = %s,
                            saturday_hours = %s,
                            sunday_hours = %s,
                            whatsapp = %s, 
                            telegram = %s, max = %s,
                            map_embed_url = %s, social_links = %s,
                            updated_at = NOW()
                        WHERE id = %s 
                        RETURNING *
                    """, (
                        phone,
                        address,
                        email,
                        opening_hours,
                        monday_hours,
                        tuesday_hours,
                        wednesday_hours,
                        thursday_hours,
                        friday_hours,
                        saturday_hours,
                        sunday_hours,
                        whatsapp,
                        telegram,
                        max_app,
                        map_embed_url,
                        json.dumps(social_links),
                        existing['id']
                    ))
                else:
                    # Create new
                    print("🆕 Creating new contact info record")
                    cur.execute("""
                        INSERT INTO contact_info 
                        (phone, address, email, opening_hours,
                         monday_hours, tuesday_hours, wednesday_hours,
                         thursday_hours, friday_hours, saturday_hours,
                         sunday_hours, whatsapp, telegram, max, 
                         map_embed_url, social_links) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
                        RETURNING *
                    """, (
                        phone,
                        address,
                        email,
                        opening_hours,
                        monday_hours,
                        tuesday_hours,
                        wednesday_hours,
                        thursday_hours,
                        friday_hours,
                        saturday_hours,
                        sunday_hours,
                        whatsapp,
                        telegram,
                        max_app,
                        map_embed_url,
                        json.dumps(social_links)
                    ))
                
                contact = cur.fetchone()
                conn.commit()
                
                print(f"✅ Database operation successful, saved record: {contact}")
                
                # Parse JSON fields for response
                if contact.get('social_links'):
                    try:
                        if isinstance(contact['social_links'], str):
                            contact['social_links'] = json.loads(contact['social_links'])
                    except:
                        contact['social_links'] = {
                            'facebook': '', 
                            'instagram': '', 
                            'vk': '', 
                            'mailru': '', 
                            'ozon': ''
                        }
                else:
                    contact['social_links'] = {
                        'facebook': '', 
                        'instagram': '', 
                        'vk': '', 
                        'mailru': '', 
                        'ozon': ''
                    }
                
                # ✅ إرسال إشعار تحديث فوري
                safe_socket_emit('contact_info_updated', contact, 'update')
                
                # إعادة تنسيق الاستجابة
                response_data = {
                    'phone': contact.get('phone', ''),
                    'address': contact.get('address', ''),
                    'email': contact.get('email', ''),
                    'openingHours': contact.get('opening_hours', ''),
                    'mondayHours': contact.get('monday_hours', ''),
                    'tuesdayHours': contact.get('tuesday_hours', ''),
                    'wednesdayHours': contact.get('wednesday_hours', ''),
                    'thursdayHours': contact.get('thursday_hours', ''),
                    'fridayHours': contact.get('friday_hours', ''),
                    'saturdayHours': contact.get('saturday_hours', ''),
                    'sundayHours': contact.get('sunday_hours', ''),
                    'whatsapp': contact.get('whatsapp', ''),
                    'telegram': contact.get('telegram', ''),
                    'max': contact.get('max', ''),
                    'mapEmbedUrl': contact.get('map_embed_url', ''),
                    'socialLinks': contact.get('social_links', {
                        'facebook': '', 
                        'instagram': '', 
                        'vk': '', 
                        'mailru': '', 
                        'ozon': ''
                    })
                }
                
                return jsonify({
                    'success': True,
                    'message': f'Contact info updated successfully via {request.method}',
                    'data': response_data
                })
                
        except Exception as e:
            print(f"❌ Error updating contact info: {e}")
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        finally:
            if conn:
                return_db_connection(conn)
                
    except Exception as e:
        print(f"❌ Update contact info error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/api/contact-info', methods=['OPTIONS'])
def contact_info_options():
    """Handle OPTIONS request for CORS"""
    return '', 200

# ==================== Image Upload Routes ====================

@app.route('/api/cloudinary/test', methods=['GET'])
def test_cloudinary():
    """Test Cloudinary connection"""
    try:
        return jsonify({
            'success': True,
            'message': 'Cloudinary is connected',
            'cloud_name': cloudinary.config().cloud_name
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/images/upload/site', methods=['POST'])
@admin_required
def upload_site_image():
    """Upload site image"""
    try:
        print("📤 Uploading site image...")
        
        # Check if file was uploaded
        if 'image' not in request.files:
            print("❌ No file uploaded")
            return jsonify({
                'success': False,
                'error': 'No file uploaded'
            }), 400
        
        file = request.files['image']
        if file.filename == '':
            print("❌ No file selected")
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Check file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if file_ext not in allowed_extensions:
            print(f"❌ Invalid file type: {file_ext}")
            return jsonify({
                'success': False,
                'error': 'File type not allowed. Allowed: PNG, JPG, JPEG, GIF, WebP, SVG'
            }), 400
        
        # Get form data
        image_type = request.form.get('image_type', 'general')
        alt_text = request.form.get('alt_text', '')
        description = request.form.get('description', '')
        
        print(f"📝 Image type: {image_type}")
        
        # Upload to Cloudinary
        try:
            upload_result = upload_to_cloudinary(file, folder="istanbul_restaurant/site_images")
            print(f"✅ Cloudinary upload successful: {upload_result['url']}")
        except Exception as e:
            print(f"❌ Cloudinary upload failed: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to upload image: {str(e)}'
            }), 500
        
        # Save to database
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO site_images 
                    (image_type, image_url, public_id, alt_text, description) 
                    VALUES (%s, %s, %s, %s, %s) 
                    RETURNING *
                """, (
                    image_type,
                    upload_result['url'],
                    upload_result['public_id'],
                    alt_text,
                    description
                ))
                
                image = cur.fetchone()
                conn.commit()
                
                print(f"✅ Database record created: {image['id']}")
                
                # ✅ إرسال إشعار تحديث فوري
                safe_socket_emit('site_image_uploaded', image, 'create')
                
                return jsonify({
                    'success': True,
                    'message': 'Image uploaded successfully',
                    'data': image
                })
                
        except Exception as e:
            print(f"❌ Database error: {e}")
            # Try to delete from Cloudinary if database fails
            try:
                if 'public_id' in upload_result:
                    delete_from_cloudinary(upload_result['public_id'])
                    print("⚠️ Deleted image from Cloudinary due to database error")
            except:
                pass
            
            return jsonify({
                'success': False,
                'error': 'Database error while saving image'
            }), 500
        finally:
            if conn:
                return_db_connection(conn)
                
    except Exception as e:
        print(f"❌ Upload site image error: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@app.route('/api/images/upload/menu', methods=['POST'])
@admin_required
def upload_menu_image():
    """Upload menu image"""
    try:
        # Check if file was uploaded
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file uploaded'
            }), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Check file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': 'File type not allowed. Allowed: PNG, JPG, JPEG, GIF, WebP'
            }), 400
        
        # Get menu item ID
        menu_item_id = request.form.get('menu_item_id')
        if not menu_item_id:
            return jsonify({
                'success': False,
                'error': 'Menu item ID is required'
            }), 400
        
        try:
            menu_item_id = int(menu_item_id)
        except:
            return jsonify({
                'success': False,
                'error': 'Invalid menu item ID'
            }), 400
        
        # Upload to Cloudinary
        try:
            upload_result = upload_to_cloudinary(file, folder="istanbul_restaurant/menu_items")
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Failed to upload image: {str(e)}'
            }), 500
        
        # Save to database
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if this is the first image for this menu item
                cur.execute("""
                    SELECT COUNT(*) FROM menu_images WHERE menu_item_id = %s
                """, (menu_item_id,))
                count = cur.fetchone()['count']
                is_main = count == 0
                
                cur.execute("""
                    INSERT INTO menu_images 
                    (menu_item_id, image_url, public_id, is_main) 
                    VALUES (%s, %s, %s, %s) 
                    RETURNING *
                """, (
                    menu_item_id,
                    upload_result['url'],
                    upload_result['public_id'],
                    is_main
                ))
                
                image = cur.fetchone()
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Menu image uploaded successfully',
                    'data': image
                })
                
        except Exception as e:
            print(f"❌ Database error: {e}")
            # Try to delete from Cloudinary if database fails
            try:
                if 'public_id' in upload_result:
                    delete_from_cloudinary(upload_result['public_id'])
            except:
                pass
            
            return jsonify({
                'success': False,
                'error': 'Database error while saving image'
            }), 500
        finally:
            if conn:
                return_db_connection(conn)
                
    except Exception as e:
        print(f"❌ Upload menu image error: {e}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@app.route('/api/site-images', methods=['GET'])
def get_site_images():
    """Get all site images"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    id,
                    image_type,
                    image_url,
                    public_id,
                    alt_text,
                    description,
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                FROM site_images 
                ORDER BY created_at DESC
            """)
            images = cur.fetchall()
            return jsonify({
                'success': True,
                'data': images
            })
    except Exception as e:
        print(f"❌ Error fetching site images: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
    finally:
        if conn:
            return_db_connection(conn)

@app.route('/api/site-images/<int:id>', methods=['DELETE'])
@admin_required
def delete_site_image(id):
    """Delete site image"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get image info before deleting
            cur.execute("SELECT image_url, public_id FROM site_images WHERE id = %s", (id,))
            image = cur.fetchone()
            
            if not image:
                return jsonify({
                    'success': False,
                    'error': 'Image not found'
                }), 404
            
            # Delete from Cloudinary if public_id exists
            if image['public_id']:
                try:
                    delete_success = delete_from_cloudinary(image['public_id'])
                    if not delete_success:
                        print(f"⚠️ Failed to delete from Cloudinary: {image['public_id']}")
                except Exception as e:
                    print(f"⚠️ Cloudinary delete error: {e}")
            
            # Delete from database
            cur.execute("DELETE FROM site_images WHERE id = %s RETURNING id", (id,))
            deleted = cur.fetchone()
            conn.commit()
            
            if deleted:
                # ✅ إرسال إشعار تحديث فوري
                safe_socket_emit('site_image_deleted', {'id': id, 'image': image}, 'delete')
                
                return jsonify({
                    'success': True,
                    'message': 'Image deleted successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to delete image from database'
                }), 500
                
    except Exception as e:
        print(f"❌ Error deleting site image: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            return_db_connection(conn)

@app.route('/api/menu-items/<int:id>/images', methods=['GET'])
def get_menu_images(id):
    """Get images for a menu item"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    id,
                    menu_item_id as "menuItemId",
                    image_url as "imageUrl",
                    public_id as "publicId",
                    is_main as "isMain",
                    created_at as "createdAt"
                FROM menu_images 
                WHERE menu_item_id = %s 
                ORDER BY is_main DESC, id
            """, (id,))
            images = cur.fetchall()
            return jsonify({
                'success': True,
                'data': images
            })
    except Exception as e:
        print(f"❌ Error fetching menu images: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
    finally:
        if conn:
            return_db_connection(conn)

# ==================== Dashboard Routes ====================

@app.route('/api/dashboard/stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    """Get dashboard statistics"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            stats = {}
            
            queries = {
                'totalCategories': "SELECT COUNT(*) FROM categories",
                'totalItems': "SELECT COUNT(*) FROM menu_items",
                'availableItems': "SELECT COUNT(*) FROM menu_items WHERE is_available = true",
                'featuredItems': "SELECT COUNT(*) FROM menu_items WHERE is_featured = true",
                'itemsWithDiscount': "SELECT COUNT(*) FROM menu_items WHERE has_discount = true",
                'pendingOrders': "SELECT COUNT(*) FROM orders WHERE status = 'pending'",
                'totalOrders': "SELECT COUNT(*) FROM orders",
                'todayOrders': "SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE",
                'totalRevenue': "SELECT COALESCE(SUM(total_price), 0) FROM orders"
            }
            
            for key, query in queries.items():
                cur.execute(query)
                stats[key] = cur.fetchone()[0]
            
            return jsonify({
                'success': True,
                'data': stats
            })
    except Exception as e:
        print(f"❌ Error fetching dashboard stats: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            return_db_connection(conn)

# ==================== WebSocket Events ====================

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket client connection"""
    print('🔗 Client connected via WebSocket')
    emit('connected', {'message': 'Connected to Istanbul Restaurant API', 'timestamp': datetime.now().isoformat()})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket client disconnection"""
    print('🔌 Client disconnected from WebSocket')

# ==================== Error Handlers ====================

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({
        'success': False,
        'error': 'Resource not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

# ==================== Startup ====================

if __name__ == '__main__':
    # Initialize database pool
    init_db_pool()
    
    print("=" * 50)
    print("🚀 Istanbul Restaurant API Starting...")
    print("=" * 50)
    print(f"📍 Server IP: {server_ip}")
    print(f"📍 Backend URL: http://{server_ip}:3000")
    print(f"📍 API Base: http://{server_ip}:3000/api")
    print(f"📍 WebSocket: ws://{server_ip}:3000")
    print(f"☁️  Cloudinary: {cloudinary.config().cloud_name}")
    print(f"🗄️  Database: {os.getenv('DB_NAME', 'restaurant_db')}")
    print(f"👤 Admin: admin@istanbul.ru / admin123")
    print("=" * 50)
    
    # Run the app with WebSocket support
    socketio.run(app, host='0.0.0.0', port=3000, debug=True, allow_unsafe_werkzeug=True)