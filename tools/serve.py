#!/usr/bin/env python3
"""Local web server for Dragon Ball Z: Saiyan Cephas.

    python3 tools/serve.py [port]

Serves the game on your home Wi-Fi and prints the address to open (or scan
qr/qr-wifi.png) on a phone or tablet.
"""
import http.server
import os
import socket
import socketserver
import sys
from urllib.parse import unquote, urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8947
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# only the game gets served — never .git, tools or anything else
ALLOW = {"", "index.html", "css", "js", "icons", "img", "manifest.webmanifest",
         "sw.js", "qr", "dist", "PRINT_ME.html", "favicon.ico"}


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".js": "application/javascript",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        parts = [p for p in unquote(urlparse(self.path).path).split("/") if p]
        blocked = (any(p.startswith(".") for p in parts) or
                   (parts and parts[0] not in ALLOW))
        if blocked:
            self.send_error(404, "Not found")
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "--quiet" not in sys.argv:
            super().log_message(fmt, *args)


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def handle_error(self, request, client_address):
        exc = sys.exc_info()[1]
        if isinstance(exc, (ConnectionResetError, BrokenPipeError, TimeoutError)):
            return                       # phones dropping connections is normal
        super().handle_error(request, client_address)


if __name__ == "__main__":
    with Server(("0.0.0.0", PORT), Handler) as httpd:
        print("Dragon Ball Z: Saiyan Cephas is serving!")
        print("  On this computer : http://localhost:%d" % PORT)
        print("  On home Wi-Fi    : http://%s:%d   <-- phones & tablets" % (lan_ip(), PORT))
        print("Press Ctrl+C to stop.")
        httpd.serve_forever()
