#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ContaDriver DiDi - Servidor Local y Lanzador
Abre la aplicación contable en tu navegador y permite abrirla en tu celular.
"""

import http.server
import socket
import socketserver
import webbrowser
import os
import sys

PORT = 8000

def get_local_ip():
    """Obtiene la dirección IP local en la red Wi-Fi/LAN."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        # Conectar a una IP externa (no envía datos reales)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Desactivar caché estricta para desarrollo fluido
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    # Cambiar al directorio del script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Buscar puerto libre si 8000 está ocupado
    global PORT
    for p in range(8000, 8020):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', p))
                PORT = p
                break
        except OSError:
            continue

    local_ip = get_local_ip()
    local_url = f"http://localhost:{PORT}"
    mobile_url = f"http://{local_ip}:{PORT}"

    print("=" * 65)
    print("   🚗  CONTADRIVER - CONTABILIDAD PARA CONDUCTORES DIDI  🚗")
    print("=" * 65)
    print(f"\n [✓] Servidor activo con éxito.")
    print(f" [PC]  En esta computadora:  {local_url}")
    print(f" [📱]  En tu celular (mismo WiFi): {mobile_url}")
    print("\n -> Abriendo navegador web automáticamente...")
    print(" -> Presiona Ctrl + C en esta ventana para detener el servidor.\n")
    print("=" * 65)

    # Abrir en el navegador local
    webbrowser.open(local_url)

    # Iniciar servidor HTTP
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido. ¡Que tengas un excelente y productivo turno!")

if __name__ == '__main__':
    main()
