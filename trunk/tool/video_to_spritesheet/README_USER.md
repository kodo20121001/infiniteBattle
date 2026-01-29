# Video to Sprite Sheet 工具

将视频转换为精灵图（Sprite Sheet），支持自动背景移除和TexturePacker格式输出。

## 🚀 快速开始

### 1. 安装环境（首次使用）

**方式A：自动安装（推荐）**
1. 确保已安装 [Anaconda](https://www.anaconda.com/download) 或 [Miniconda](https://docs.conda.io/en/latest/miniconda.html)
2. 双击运行 `install.bat`
3. 等待安装完成（约5-10分钟）

**方式B：手动安装**
```bash
conda create -n video_sprite python=3.10 -y
conda activate video_sprite
pip install -r requirements.txt
```

### 2. 启动程序

双击运行 `启动GUI.bat`

或手动启动：
```bash
conda activate video_sprite
python gui.py
```

## ✨ 功能特点

- 🎨 **自动背景移除** - 使用AI技术自动去除背景
- ✂️ **智能裁剪** - 自动检测并裁剪透明区域
- 📐 **手动调整** - 可视化界面调整每帧的裁剪区域
- 📦 **TexturePacker格式** - 标准格式输出，兼容各游戏引擎
- 🎬 **动画预览** - 实时预览生成的动画效果
- 🔧 **参数可调** - 压缩比率、图集大小、帧率等自由设置

## 📋 使用流程

1. **选择视频文件** - 点击"Browse"选择输入视频
2. **提取帧** - 点击"Extract Frames"，程序会自动去背景并裁剪
3. **查看缩略图** - 浏览所有提取的帧
4. **调整裁剪区域**（可选）- 点击帧缩略图，使用滑动栏调整裁剪范围
5. **生成精灵图** - 点击"Generate Sprite Sheet"生成最终输出
6. **预览动画** - 在右侧预览区查看动画效果

## 🎮 输出说明

生成的文件位于 `output` 文件夹：

```
output/
├── frames/                    # 提取的帧图片
│   ├── frame_0000.png
│   ├── frame_0001.png
│   └── ...
├── spritesheet.png           # 精灵图
└── spritesheet.json          # TexturePacker格式元数据
```

## ⚙️ 参数说明

- **Compress Ratio** (0.5-1.0): 压缩比率，1.0为原始分辨率
- **Atlas Size** (512-2048): 单张精灵图的尺寸
- **FPS Interval** (1-120): 每隔多少帧提取一帧

## 📖 常见问题

**Q: 程序启动很慢？**  
A: 第一次运行需要下载AI模型（约300MB），请耐心等待。

**Q: 视频背景没有完全去除？**  
A: 可以在提取帧后，手动调整每帧的裁剪区域。

**Q: 生成的精灵图太大？**  
A: 调整"Compress Ratio"参数降低分辨率，或增加"FPS Interval"减少帧数。

**Q: 如何更新到新版本？**  
A: 下载新版的py文件直接替换即可，无需重新安装环境。

**Q: pip安装很慢？**  
A: 使用国内镜像加速：
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

## 💻 系统要求

- Windows 10/11
- Anaconda 或 Miniconda
- 4GB+ RAM（推荐8GB）
- 500MB+ 磁盘空间

## 📞 技术支持

如有问题，请查看 `DISTRIBUTION_GUIDE.md` 了解更多详细信息。

## 📄 开源协议

MIT License - 可自由使用和修改
