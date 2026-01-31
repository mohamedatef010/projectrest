#!/usr/bin/env python3
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, socketio, init_db_pool

if __name__ == '__main__':
    # Initialize database pool
    init_db_pool()
    
    port = int(os.getenv('PORT', 3000))
    
    print("=" * 50)
    print("🚀 Istanbul Restaurant API Starting...")
    print("=" * 50)
    print(f"📍 Backend URL: http://localhost:{port}")
    print(f"📍 API Base: http://localhost:{port}/api")
    print(f"📍 WebSocket: ws://localhost:{port}")
    print(f"📍 Frontend: http://localhost:5173")
    print(f"☁️  Cloudinary: {os.getenv('CLOUDINARY_CLOUD_NAME')}")
    print(f"🗄️  Database: {os.getenv('DB_NAME')}")
    print(f"👤 Admin: admin@istanbul.ru / admin123")
    print("=" * 50)
    
    # Run with SocketIO support
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)