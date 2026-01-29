# 🎬 视频转Sprite Sheet 工具 - 项目启动指南

## 🎉 欢迎！

您已拥有一个功能完整、文档齐全的视频转Sprite Sheet工具。本文件将帮助您快速上手。

**新功能🎉：** 
- ✨ 自动背景去除（使用rembg）
- ✨ 智能图片裁剪（自动去除透明边界）
- ✨ TexturePacker格式导出（专业游戏资源格式）

---

## ⚡ 最快30秒启动

### Windows用户
1. **双击文件**
   ```
   launch_gui.bat
   ```

2. **拖拽视频到窗口**

3. **点击"开始转换"按钮**

### Linux/Mac用户
1. **在终端运行**
   ```bash
   python3 gui.py
   ```

2. **拖拽视频到窗口**

3. **点击"开始转换"按钮**

---

## 📦 安装（仅需一次）

### Step 1: 安装依赖
```bash
pip install -r requirements.txt
```

这会安装：
- `opencv-python` - 视频处理
- `Pillow` - 图像处理  
- `PyQt5` - GUI框架

### Step 2: 验证安装
```bash
python check_project.py
```

显示 "✅ 项目检查通过" 表示安装成功。

---

## 🚀 三种使用方式

### 1️⃣ GUI图形界面 ⭐ **推荐新手**

**启动方式：**
```bash
python gui.py
```

**优点：**
- 拖拽视频，一键转换
- 参数实时预览
- 无需学习命令行
- 界面友好直观

**使用步骤：**
1. 拖拽或选择视频
2. 选择预设（或自定义参数）
3. 点击"开始转换"
4. 等待完成

**文档参考：** [GUI_GUIDE.md](GUI_GUIDE.md)

---

### 2️⃣ 命令行工具 ⭐ **推荐进阶用户**

**使用预设：**
```bash
python quickstart.py input/video.mp4 -p 标准动画
```

**自定义参数：**
```bash
python main.py input/video.mp4 -fs 256 -as 1024 -fps 30
```

**优点：**
- 高度灵活
- 支持脚本自动化
- 批量处理多个视频

**文档参考：** [GETTING_STARTED.md](GETTING_STARTED.md)

---

### 3️⃣ Python API ⭐ **推荐开发者**

```python
from main import VideoToSpriteSheet

converter = VideoToSpriteSheet(
    video_path='input/video.mp4',
    output_dir='output',
    frame_size=256,
    atlas_size=1024,
    fps_interval=30
)

converter.run()
```

**优点：**
- 完全可编程
- 灵活集成
- 支持复杂逻辑

**文档参考：** [example_usage.py](example_usage.py)

---

## 📖 文档导航

按您的需求选择相应文档：

### 🔥 我需要...

| 我需要... | 查看文档 | 时间 |
|-----------|--------|------|
| 快速上手 | [QUICKREF.md](QUICKREF.md) | 5分钟 |
| 使用GUI | [GUI_GUIDE.md](GUI_GUIDE.md) | 10分钟 |
| 命令行用法 | [GETTING_STARTED.md](GETTING_STARTED.md) | 10分钟 |
| 完整功能说明 | [README.md](README.md) | 20分钟 |
| 游戏中使用 | [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | 30分钟 |
| 了解项目 | [PROJECT.md](PROJECT.md) | 15分钟 |

---

## 🎯 常见场景

### 场景1：快速转换一个视频（推荐GUI）
```bash
python gui.py
# 拖拽视频 → 选择预设 → 点击转换
```

### 场景2：批量转换多个视频（推荐命令行）
```bash
for f in input/*.mp4; do
    python main.py "$f" -p 标准动画 -o "output/${f%.mp4}"
done
```

### 场景3：游戏项目中使用（参考集成指南）
参考 [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) 中的游戏引擎代码

### 场景4：自动化处理（Python API）
编写Python脚本调用 `VideoToSpriteSheet` 类

---

## 💾 输出文件说明

转换完成后，在 `output/` 文件夹中：

```
output/
├── spritesheet_000.png   ← 复制此文件到游戏项目
├── spritesheet.json      ← 复制此文件到游戏项目
└── frames/               ← 临时文件夹（可删除以节省空间）
    ├── frame_00000.png
    └── ...
```

### 如何在游戏中使用

1. **复制文件**
   ```
   复制 spritesheet_000.png 到游戏的 assets/ 目录
   复制 spritesheet.json 到游戏的 assets/ 目录
   ```

2. **在游戏中加载**
   ```javascript
   // JavaScript示例
   const metadata = await fetch('spritesheet.json').then(r => r.json());
   const image = new Image();
   image.src = 'spritesheet_000.png';
   ```

3. **根据帧号渲染**
   参考 [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) 中的完整代码

---

## 🎮 预设配置速查

快速选择适合您的场景的预设：

| 预设 | 用途 | 启动命令 |
|------|------|--------|
| 高帧率动画 | 流畅角色动画 | `-p 高帧率动画` |
| **标准动画** | **一般场景（推荐）** | **`-p 标准动画`** |
| 低帧率动画 | 节省空间 | `-p 低帧率动画` |
| 高分辨率 | 高质量 | `-p 高分辨率` |
| 小图标 | UI/图标动画 | `-p 小图标` |

**推荐：** 大多数情况下选择"标准动画"

---

## 🔧 参数调整快速参考

不确定怎样调参？这里有快速指南：

### 动画看起来卡顿
→ 减小 `fps_interval` 值
```bash
python main.py video.mp4 -fps 15  # 更流畅
```

### 文件太大
→ 减小 `frame_size` 或增大 `fps_interval`
```bash
python main.py video.mp4 -fs 128 -fps 60  # 更小
```

### 质量不够好
→ 增大 `frame_size`
```bash
python main.py video.mp4 -fs 512  # 更清晰
```

### 不确定怎样设置
→ 使用预设
```bash
python quickstart.py video.mp4 -p 标准动画
```

---

## � 输出格式详解

### TexturePacker格式（推荐）

生成的JSON文件（`spritesheet.json`）采用**TexturePacker标准格式**，可直接导入到：
- Unity
- Godot
- Cocos2d-x
- 其他游戏引擎

**JSON结构：**
```json
{
  "meta": {
    "app": "VideoToSpriteSheet",
    "version": "1.0",
    "image": "spritesheet_000.png",
    "format": "RGBA8888",
    "size": {"w": 1024, "h": 1024},
    "scale": "1"
  },
  "frames": {
    "frame_00000.png": {
      "frame": {"x": 0, "y": 0, "w": 128, "h": 128},
      "rotated": false,
      "trimmed": true,
      "spriteSourceSize": {"x": 10, "y": 15, "w": 108, "h": 103},
      "sourceSize": {"w": 128, "h": 128},
      "duration": 33
    }
  }
}
```

**关键字段说明：**
- `frame` - 该帧在精灵图中的位置和大小
- `trimmed` - 是否被自动裁剪（去除透明边界）
- `spriteSourceSize` - 裁剪后内容的位置和大小
- `sourceSize` - 原始帧的大小（裁剪前）
- `duration` - 帧时长（毫秒）

### 智能裁剪功能

该工具自动：
1. **去除视频背景** - 使用深度学习（rembg）去除背景
2. **裁剪透明区域** - 自动检测并去除图片周围的透明像素
3. **保留位置信息** - 在JSON中记录裁剪偏移量

这样生成的Sprite Sheet更加紧凑，节省空间，特别是对于角色动画。

### 多Sheet支持

如果一个Sheet放不下所有帧，工具会自动创建多个Sheet：
- `spritesheet_000.png` + `spritesheet_000.json`
- `spritesheet_001.png` + `spritesheet_001.json`
- `spritesheet_002.png` + `spritesheet_002.json`
- ...

每个JSON都是独立的，可以分别加载。

---

## 💡 常见问题

### Q: 我是Windows用户，怎样启动？
**A:** 双击 `launch_gui.bat` 文件

### Q: 我是Linux/Mac用户，怎样启动？
**A:** 在终端运行 `python3 gui.py`

### Q: GUI启动很慢
**A:** 首次启动PyQt5会初始化，属于正常现象。后续启动会很快。

### Q: 拖拽不工作
**A:** 使用"浏览"按钮选择文件，或在命令行运行

### Q: 支持哪些视频格式？
**A:** OpenCV支持的所有格式：mp4, avi, mov, mkv, flv等

### Q: 转换需要多长时间？
**A:** 取决于视频长度和帧大小。通常几分钟到十几分钟

### Q: 如何处理多个视频？
**A:** 使用命令行编写脚本或使用 Python API

### Q: TexturePacker格式是什么？
**A:** 这是业界标准的精灵图格式，可导入到任何现代游戏引擎。包含精灵位置、大小、裁剪信息等。

### Q: 背景去除效果不好？
**A:** 首先确保已安装rembg：`pip install rembg`。对于复杂背景，可能需要调整或手动处理。

---

## 📝 文件清单

### 核心文件
- ✅ `main.py` - 转换引擎
- ✅ `gui.py` - GUI界面
- ✅ `quickstart.py` - 快速启动

### 启动脚本  
- ✅ `launch_gui.bat` - Windows GUI启动
- ✅ `launch_gui.sh` - Linux/Mac GUI启动
- ✅ `run.bat` - Windows命令行启动

### 配置与依赖
- ✅ `config.json` - 预设配置
- ✅ `requirements.txt` - 依赖列表

### 文档（9份）
- ✅ `START.md` - **本文件（项目启动指南）**
- ✅ `QUICKREF.md` - 快速参考卡
- ✅ `GUI_GUIDE.md` - GUI详细指南
- ✅ `GUI_README.md` - GUI更新说明
- ✅ `GETTING_STARTED.md` - 命令行快速开始
- ✅ `README.md` - 完整说明
- ✅ `INTEGRATION_GUIDE.md` - 游戏引擎集成
- ✅ `PROJECT.md` - 项目说明
- ✅ `SUMMARY.md` - 项目完成总结

### 工具脚本
- ✅ `check_project.py` - 项目检查
- ✅ `example_usage.py` - 使用示例

### 文件夹
- ✅ `input/` - 输入视频放这里
- ✅ `output/` - 输出结果在这里

---

## 🎓 学习路径

### 5分钟快速体验
1. 双击 `launch_gui.bat` (或 `python gui.py`)
2. 拖拽一个视频文件
3. 点击"开始转换"

### 30分钟深入学习
1. 阅读 [QUICKREF.md](QUICKREF.md)（快速参考）
2. 阅读 [GUI_GUIDE.md](GUI_GUIDE.md)（GUI教程）
3. 尝试不同的预设配置

### 2小时完全掌握
1. 阅读 [README.md](README.md)（完整说明）
2. 阅读 [GETTING_STARTED.md](GETTING_STARTED.md)（命令行）
3. 尝试自定义参数和脚本

### 游戏开发集成
1. 阅读 [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
2. 参考对应游戏引擎的代码示例
3. 在项目中实现

---

## 🚀 立即开始

### 选择您的方式：

#### 方式A：GUI图形界面（推荐新手）
```bash
python gui.py
```

#### 方式B：命令行（推荐进阶）
```bash
python quickstart.py input/video.mp4 -p 标准动画
```

#### 方式C：查看快速参考
打开 [QUICKREF.md](QUICKREF.md)

---

## 🌟 项目亮点

✨ **完整功能**
- 视频转序列帧（自动去除背景）
- Sprite Sheet生成（自动优化排列）
- TexturePacker格式导出（专业游戏资源）
- 智能图片裁剪（自动去除透明边界）
- 动画预览（黑/白背景选择）

✨ **用户友好**
- GUI图形界面
- 拖拽上传
- 5种预设配置
- 实时转换进度

✨ **文档完善**
- 项目启动指南
- 完整参数说明
- 常见问题解答

✨ **灵活使用**
- GUI版本
- 命令行版本
- Python API

---

## 💬 获得帮助

1. **快速问题** → 查看 [QUICKREF.md](QUICKREF.md)
2. **GUI使用问题** → 查看 [GUI_GUIDE.md](GUI_GUIDE.md)
3. **命令行问题** → 查看 [GETTING_STARTED.md](GETTING_STARTED.md)
4. **游戏集成问题** → 查看 [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
5. **所有问题** → 查看 [README.md](README.md)

---

## 📊 项目统计

| 项目 | 数量 |
|------|------|
| Python文件 | 5个 |
| 文档文件 | 9个 |
| 配置文件 | 2个 |
| 启动脚本 | 3个 |
| **总文件数** | **≈20个** |

| 支持 | 状态 |
|------|------|
| Windows | ✅ |
| Linux | ✅ |
| macOS | ✅ |
| GUI | ✅ |
| 命令行 | ✅ |
| Python API | ✅ |

---

## 🎯 下一步

### 现在就做
```bash
# 启动GUI
python gui.py

# 或者
# 使用命令行
python main.py input/video.mp4

# 或者
# 查看快速参考
# 打开 QUICKREF.md
```

### 今天完成
- ✅ 安装依赖
- ✅ 转换一个视频
- ✅ 查看输出文件

### 这周完成
- ✅ 学习所有参数
- ✅ 尝试不同预设
- ✅ 集成到游戏项目

---

## 🎉 祝贺！

您现在拥有了一个功能完整、文档齐全的视频转Sprite Sheet工具。

**立即开始：**
```bash
python gui.py
```

**或者：**
```bash
python main.py input/your_video.mp4
```

---

## 📞 最后提醒

- 📖 文档很重要，有问题先看文档
- 🎯 不确定参数就用预设
- 💡 GUI版本最容易上手
- 🚀 命令行版本最灵活

**祝您使用愉快！🎉**

---

*项目完成于 2026年1月28日*
*版本：1.0*
*文档：完整*
*功能：完整*
