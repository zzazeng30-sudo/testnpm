# python_bot/launcher.py
import threading
import webbrowser
import pystray
from PIL import Image, ImageDraw
import os
import sys

# 우리가 만든 파일들 불러오기
import bot_main
import config

# 프로그램 실행 상태 관리
is_running = True

def check_running():
    return is_running

def create_icon_image():
    """트레이 아이콘용 파란색 네모 그림 그리기"""
    width = 64
    height = 64
    image = Image.new('RGB', (width, height), "blue")
    dc = ImageDraw.Draw(image)
    dc.rectangle((20, 20, 44, 44), fill="white")
    return image

def run_bot_thread():
    """봇을 뒷단(백그라운드)에서 실행"""
    bot_main.start_bot_service(check_running)

def on_open_site(icon, item):
    webbrowser.open(config.WEB_SITE_URL)

def on_quit(icon, item):
    global is_running
    is_running = False
    icon.stop()
    os._exit(0)

def main():
    # 1. 봇 실행 (스레드)
    t = threading.Thread(target=run_bot_thread, daemon=True)
    t.start()
    
    # 2. 웹사이트 자동 접속
    print(f"🌐 웹사이트 접속: {config.WEB_SITE_URL}")
    webbrowser.open(config.WEB_SITE_URL)
    
    # 3. 트레이 아이콘 생성
    image = create_icon_image()
    menu = (
        pystray.MenuItem('사이트 열기', on_open_site),
        pystray.MenuItem('종료', on_quit),
    )
    icon = pystray.Icon("BuildingBot", image, "건축물대장 봇 (실행중)", menu)
    icon.run()

if __name__ == "__main__":
    main()