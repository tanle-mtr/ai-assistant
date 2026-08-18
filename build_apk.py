#!/usr/bin/env python3
"""
AI 对话助手 - APK 构建脚本
Usage: python build_apk.py [--version DEEPSEEK|OPENAI|MOONSHOT|ZHIPU|DEFAULT]
"""

import zipfile
import os
import sys
import argparse
import shutil
import subprocess
from pathlib import Path

TEMPLATE_APK = Path(__file__).parent / ".." / "APP IDE" / "ai-mobile-builder" / "AI_App_Builder.apk"
OUTPUT_DIR = Path(__file__).parent
WEB_DIR = Path(__file__).parent
KEYSTORE_PATH = OUTPUT_DIR / "debug.keystore"

VERSIONS = {
    "deepseek": {"name": "AI助手-DeepSeek", "url": "https://api.deepseek.com/v1"},
    "openai": {"name": "AI助手-OpenAI", "url": "https://api.openai.com/v1"},
    "moonshot": {"name": "AI助手-Moonshot", "url": "https://api.moonshot.cn/v1"},
    "zhipu": {"name": "AI助手-Zhipu", "url": "https://open.bigmodel.cn/api/paas/v4"},
    "default": {"name": "AI助手", "url": ""},
}

def check_java():
    """Check if Java is available"""
    java_paths = [
        "C:\\Program Files\\Microsoft\\jdk-25.0.3.9-hotspot\\bin\\java.exe",
        "java"
    ]
    for path in java_paths:
        if shutil.which(path) or os.path.exists(path):
            return path
    return None

def create_apk(version):
    """Create APK for specified version"""
    config = VERSIONS[version]
    output_apk = OUTPUT_DIR / f"{config['name']}.apk"
    
    print(f"Creating {config['name']}.apk...")
    
    # Find template
    if not TEMPLATE_APK.exists():
        print(f"Error: Template APK not found at {TEMPLATE_APK}")
        sys.exit(1)
    
    # Create APK
    with zipfile.ZipFile(TEMPLATE_APK, 'r') as zf_in:
        with zipfile.ZipFile(output_apk, 'w', zipfile.ZIP_DEFLATED) as zf_out:
            # Copy template entries (excluding META-INF)
            for name in zf_in.namelist():
                if not name.startswith('META-INF/') and not name.startswith('resources/'):
                    data = zf_in.read(name)
                    zf_out.writestr(name, data)
            
            # Add our web files
            for root, dirs, files in os.walk(WEB_DIR):
                for f in files:
                    if f.endswith(('.html', '.js', '.css')) and f not in ['index.txt', '404.html']:
                        full_path = Path(root) / f
                        arc_name = f"assets/{f}"
                        zf_out.write(full_path, arc_name)
    
    print(f"Created: {output_apk} ({output_apk.stat().st_size / 1024:.1f} KB)")
    return output_apk

def sign_apk(apk_path):
    """Sign APK with debug keystore"""
    java = check_java()
    if not java:
        print("Warning: Java not found, skipping signing")
        return
    
    keytool_path = str(Path(java).parent / "keytool.exe")
    jarsigner_path = str(Path(java).parent / "jarsigner.exe")
    
    if not KEYSTORE_PATH.exists():
        print("Generating debug keystore...")
        subprocess.run([
            keytool_path, "-genkeypair", "-v",
            "-keystore", str(KEYSTORE_PATH),
            "-storepass", "android", "-keypass", "android",
            "-alias", "androiddebugkey",
            "-dname", "CN=Android Debug,O=Android,C=US",
            "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000"
        ], capture_output=True)
    
    print(f"Signing {apk_path.name}...")
    subprocess.run([
        jarsigner_path, "-verbose", "-sigalg", "SHA1withRSA", "-digestalg", "SHA1",
        "-keystore", str(KEYSTORE_PATH),
        "-storepass", "android", "-keypass", "android",
        str(apk_path), "androiddebugkey"
    ], capture_output=True)
    print(f"Signed: {apk_path.name}")

def main():
    parser = argparse.ArgumentParser(description="Build AI Assistant APK")
    parser.add_argument("--version", choices=list(VERSIONS.keys()), default="default",
                        help="APK version to build")
    parser.add_argument("--all", action="store_true", help="Build all versions")
    parser.add_argument("--sign", action="store_true", help="Sign APKs")
    args = parser.parse_args()
    
    versions = list(VERSIONS.keys()) if args.all else [args.version]
    
    for v in versions:
        apk = create_apk(v)
        if args.sign:
            sign_apk(apk)
    
    print("\nDone!")
    print("APK files:")
    for apk in OUTPUT_DIR.glob("*.apk"):
        print(f"  - {apk.name} ({apk.stat().st_size / 1024:.1f} KB)")

if __name__ == "__main__":
    main()