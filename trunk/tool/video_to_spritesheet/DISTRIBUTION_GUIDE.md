# Video to Sprite Sheet - 使用说明

## 📦 分发给其他人使用（推荐方案）

### 方案1：源码 + 自动安装脚本（推荐）

**打包给用户：**
```
VideoToSpriteSheet/
├── gui.py
├── main.py
├── config.json
├── requirements.txt
├── install.bat          # 自动安装脚本
├── 启动GUI.bat          # 启动脚本
└── README_USER.md       # 用户使用说明
```

**用户操作步骤：**
1. 确保已安装Anaconda（如果没有，从 https://www.anaconda.com/download 下载）
2. 双击运行 `install.bat`（自动创建环境和安装依赖）
3. 双击运行 `启动GUI.bat` 启动程序

**优点：**
- ✅ 文件小（只有几KB的源码）
- ✅ 用户操作简单（双击即可）
- ✅ 易于更新（替换py文件即可）

---

### 方案2：requirements.txt（程序员用户）

给熟悉Python的用户：

```bash
# 1. 创建虚拟环境
conda create -n video_sprite python=3.10 -y
conda activate video_sprite

# 2. 安装依赖
pip install -r requirements.txt

# 3. 运行程序
python gui.py
```

---

### 方案3：conda环境导出（精确复现）

```bash
# 导出当前环境
conda activate my_rembg
conda env export > environment.yml

# 用户安装
conda env create -f environment.yml
conda activate my_rembg
python gui.py
```

---

## 🚫 不推荐的方案

### PyInstaller打包（不推荐）

**问题：**
- ❌ 文件太大（1GB+）
- ❌ 包含大量深度学习库
- ❌ 可能被杀毒软件拦截
- ❌ 启动速度慢

**什么时候用：**
- 只在用户完全不懂技术且无法安装Python时使用
- 需要在无网络环境运行

---

## 📋 分发清单

### 最小分发包（推荐）
```
video_to_spritesheet.zip
├── gui.py              (50KB)
├── main.py             (20KB)
├── config.json         (1KB)
├── requirements.txt    (1KB)
├── install.bat         (2KB)
├── 启动GUI.bat         (1KB)
└── README_USER.md      (5KB)
```
**总大小：约80KB**

### 完整分发包（含示例）
```
video_to_spritesheet.zip
├── [上面的所有文件]
├── example_usage.py    (示例代码)
├── input/              (示例视频文件夹)
└── output/             (输出示例)
```

---

## 🎯 推荐的最佳实践

1. **发布到GitHub**
   - 上传源码到GitHub仓库
   - 用户可以git clone或下载zip
   - 提供详细的README

2. **制作Release包**
   - 在GitHub创建Release
   - 上传打包好的zip文件
   - 附上安装说明

3. **提供在线文档**
   - 图文并茂的安装教程
   - 常见问题FAQ
   - 视频演示

---

## 💡 用户安装常见问题

### Q1: 没有Anaconda怎么办？
A: 下载Miniconda（轻量版）：https://docs.conda.io/en/latest/miniconda.html

### Q2: pip安装很慢？
A: 使用国内镜像：
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q3: 报错缺少模块？
A: 重新安装：
```bash
conda activate video_sprite
pip install --force-reinstall -r requirements.txt
```

### Q4: 想要exe文件？
A: 由于依赖库太大（1GB+），建议使用自动安装脚本方式，更轻量且易于更新。

---

## 📝 给用户的README模板

创建一个 `README_USER.md`：

```markdown
# Video to Sprite Sheet 工具

将视频转换为精灵图（Sprite Sheet），支持自动背景移除和TexturePacker格式。

## 快速开始

### 1. 安装（首次使用）

确保已安装 [Anaconda](https://www.anaconda.com/download)，然后：

1. 双击运行 `install.bat`
2. 等待安装完成（需要联网）

### 2. 使用

双击运行 `启动GUI.bat` 即可。

## 功能特点

- ✅ 自动背景移除（使用AI技术）
- ✅ 智能图像裁剪
- ✅ TexturePacker格式输出
- ✅ 动画预览
- ✅ 手动调整裁剪区域

## 系统要求

- Windows 10/11
- Anaconda或Miniconda
- 4GB+ RAM

## 常见问题

**Q: 程序启动很慢？**
A: 第一次运行需要加载AI模型，请耐心等待。

**Q: 如何更新？**
A: 下载新版本的py文件替换即可。
```
