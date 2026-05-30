import os, sys, webbrowser, http.server, socketserver, socket

os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8080

# 获取本机局域网 IP
def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return '127.0.0.1'

local_ip = get_ip()

print(f'''
================================
   🎤 合成大歌姬 🎵
================================

电脑浏览器打开: http://localhost:{PORT}
手机浏览器打开: http://{local_ip}:{PORT}

(手机和电脑需在同一 WiFi 下)
按 Ctrl+C 停止服务器
================================
''')

webbrowser.open(f'http://localhost:{PORT}')

httpd = socketserver.TCPServer(('0.0.0.0', PORT), http.server.SimpleHTTPRequestHandler)
httpd.serve_forever()
