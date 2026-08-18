# 🤖 AI 对话助手

一个支持 OpenAI 兼容接口的 AI 对话应用，支持文本对话、图片生成、视频生成和图像识别功能。

## 功能特性

- **文本对话** - 支持所有 OpenAI 兼容接口（DeepSeek、智谱、OpenAI 等）
- **模型发现** - 输入 API Key 和 Base URL 后自动获取可用模型列表
- **图片识别** - 上传图像，AI 可理解图片内容
- **图片生成** - 调用 DALL-E 等生图模型
- **视频生成** - 预留视频生成接口
- **本地存储** - 对话历史和 API 配置保存在本地

## 安装方法

### APK 安装
1. 从 Releases 页面下载对应版本的 APK
2. 传输到安卓手机
3. 允许安装未知来源应用
4. 点击 APK 文件安装

### 各版本说明
| 版本 | 文件 | 说明 |
|------|------|------|
| 基础版 | AI助手.apk | 通用版本，支持任意 OpenAI 兼容接口 |
| DeepSeek版 | AI助手-DeepSeek.apk | 预配置 DeepSeek API |
| OpenAI版 | AI助手-OpenAI.apk | 预配置 OpenAI API |
| Moonshot版 | AI助手-Moonshot.apk | 预配置 Moonshot API |
| 智谱版 | AI助手-Zhipu.apk | 预配置智谱 GLM API |

## 快速开始

1. 打开应用
2. 进入设置 - 点击左下角按钮
3. 配置 API - 输入 API Key 和 Base URL
4. 发现模型 - 点击发现模型，自动获取可用模型列表
5. 开始对话 - 选择模型后发送消息

## 本地开发

```bash
# 直接打开 index.html 即可，无需服务器
# 或使用 Python 启动简易服务器:
python -m http.server 8080
# 访问 http://localhost:8080
```

## 构建 APK

### 方法一：GitHub Actions（推荐）
推送代码到 GitHub 后，APK 会自动构建并上传到 Actions Artifacts。

### 方法二：本地构建
```bash
python build_apk.py --version deepseek --sign
```

## 项目结构

```
AI-app/
├── .github/workflows/       # GitHub Actions 工作流
│   └── build.yml           # 自动构建配置
├── android/                 # Android 项目
├── www/                     # Web 应用资源
├── AI助手.apk              # 基础版 APK
├── LICENSE                  # MIT License
├── README.md               # 项目文档
└── package.json            # 项目配置
```

## 支持的 API

| 服务商 | Base URL | 获取 Key |
|--------|----------|----------|
| DeepSeek | https://api.deepseek.com/v1 | platform.deepseek.com |
| 智谱 GLM | https://open.bigmodel.cn/api/paas/v4 | open.bigmodel.cn |
| OpenAI | https://api.openai.com/v1 | platform.openai.com |
| Moonshot | https://api.moonshot.cn/v1 | platform.moonshot.cn |
| 阿里云 | https://dashscope.aliyuncs.com/compatible-mode/v1 | dashscope.console.aliyun.com |
| 自定义 | 任意 OpenAI 兼容接口 | - |

## 技术栈

- **前端**: 原生 HTML/CSS/JavaScript
- **打包**: Capacitor + Android WebView
- **CI/CD**: GitHub Actions
- **许可**: MIT License

## 许可证

本项目采用 [MIT License](LICENSE) 开源。

## 贡献

欢迎提交 Issue 和 Pull Request！
