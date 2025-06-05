#!/usr/bin/env python3
"""
Simple HTTP server to serve the frontend files
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Set the directory to serve
os.chdir('frontend')

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🌐 Frontend server running at: http://localhost:{PORT}")
        print(f"📱 Backend API running at: http://localhost:8000")
        print(f"🔐 Login with: admin / admin123")
        print("=" * 50)
        
        # Try to open the browser
        try:
            webbrowser.open(f'http://localhost:{PORT}')
        except:
            pass
            
        print("Press Ctrl+C to stop the server")
        httpd.serve_forever()