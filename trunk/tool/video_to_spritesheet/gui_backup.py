"""
视频转Sprite Sheet - GUI界面版本
使用PyQt5实现，支持拖拽视频、参数调整、实时预览
"""

import sys
import json
import os
from pathlib import Path
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QSpinBox, QComboBox, QPushButton, QFileDialog,
    QProgressBar, QMessageBox, QGroupBox, QFormLayout, QTextEdit,
    QSlider, QDoubleSpinBox, QTabWidget, QRadioButton, QButtonGroup
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QSize, QUrl, QMimeData, QTimer
from PyQt5.QtGui import QColor, QFont, QIcon, QPixmap, QDragEnterEvent, QImage
from PyQt5.QtWidgets import QFrame
import traceback
import json
from PIL import Image

from main import VideoToSpriteSheet


class ConversionWorker(QThread):
    """转换工作线程"""
    progress = pyqtSignal(str)
    finished = pyqtSignal(bool, str)
    
    def __init__(self, converter):
        super().__init__()
        self.converter = converter
    
    def run(self):
        try:
            success = self.converter.run()
            if success:
                self.finished.emit(True, "✓ 转换完成！")
            else:
                self.finished.emit(False, "✗ 转换失败")
        except Exception as e:
            self.finished.emit(False, f"✗ 错误: {str(e)}\n{traceback.format_exc()}")


class VideoToSpriteSheetGUI(QMainWindow):
    """主窗口"""
    
    def __init__(self):
        super().__init__()
        self.config = self.load_config()
        self.init_ui()
        self.setAcceptDrops(True)
    
    def load_config(self):
        """加载配置文件"""
        try:
            with open('config.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {
                'presets': {
                    '标准动画': {
                        'frame_size': 256,
                        'atlas_size': 1024,
                        'fps_interval': 30
                    }
                },
                'default_preset': '标准动画',
                'output_directory': 'output'
            }
    
    def init_ui(self):
        """初始化UI"""
        self.setWindowTitle("视频转Sprite Sheet - 图形界面版")
        self.setGeometry(100, 100, 1000, 800)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f0f0f0;
            }
            QGroupBox {
                border: 1px solid #ccc;
                border-radius: 5px;
                margin-top: 10px;
                padding-top: 10px;
                font-weight: bold;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 3px 0 3px;
            }
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 8px 16px;
                text-align: center;
                text-decoration: none;
                font-size: 14px;
                border-radius: 4px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
            QPushButton:pressed {
                background-color: #3d8b40;
            }
            QPushButton:disabled {
                background-color: #cccccc;
            }
            QLineEdit, QSpinBox, QComboBox, QDoubleSpinBox {
                padding: 5px;
                border: 1px solid #ccc;
                border-radius: 3px;
            }
        """)
        
        # 创建主widget
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        main_layout = QHBoxLayout(main_widget)
        
        # 左侧面板 - 输入和参数
        left_panel = QVBoxLayout()
        
        # 视频文件选择
        video_group = QGroupBox("视频文件")
        video_layout = QVBoxLayout()
        
        hint_label = QLabel("💡 提示: 拖拽视频文件到下方，或点击浏览按钮选择")
        hint_label.setStyleSheet("color: #666; font-size: 11px;")
        video_layout.addWidget(hint_label)
        
        self.video_display = QLineEdit()
        self.video_display.setPlaceholderText("选择视频文件或拖拽到这里...")
        self.video_display.setReadOnly(True)
        self.video_display.setMinimumHeight(40)
        self.video_display.setStyleSheet("""
            QLineEdit {
                background-color: white;
                border: 2px dashed #4CAF50;
                border-radius: 4px;
            }
        """)
        video_layout.addWidget(self.video_display)
        
        button_layout = QHBoxLayout()
        browse_btn = QPushButton("📁 浏览")
        browse_btn.clicked.connect(self.browse_video)
        button_layout.addWidget(browse_btn)
        
        clear_btn = QPushButton("🗑️ 清空")
        clear_btn.clicked.connect(lambda: self.video_display.clear())
        button_layout.addWidget(clear_btn)
        
        video_layout.addLayout(button_layout)
        video_group.setLayout(video_layout)
        left_panel.addWidget(video_group)
        
        # 参数设置
        param_group = QGroupBox("参数设置")
        param_layout = QFormLayout()
        
        # 预设选择
        preset_layout = QHBoxLayout()
        self.preset_combo = QComboBox()
        self.preset_combo.addItems(self.config['presets'].keys())
        self.preset_combo.currentTextChanged.connect(self.on_preset_changed)
        preset_layout.addWidget(self.preset_combo)
        
        preset_info_btn = QPushButton("ℹ️ 预设说明")
        preset_info_btn.clicked.connect(self.show_preset_info)
        preset_layout.addWidget(preset_info_btn)
        
        param_layout.addRow("预设配置:", preset_layout)
        
        # 单帧大小
        self.frame_size_spinbox = QSpinBox()
        self.frame_size_spinbox.setRange(64, 1024)
        self.frame_size_spinbox.setValue(256)
        self.frame_size_spinbox.setSingleStep(64)
        param_layout.addRow("单帧大小 (像素):", self.frame_size_spinbox)
        
        # Atlas大小
        self.atlas_size_spinbox = QSpinBox()
        self.atlas_size_spinbox.setRange(512, 2048)
        self.atlas_size_spinbox.setValue(1024)
        self.atlas_size_spinbox.setSingleStep(256)
        param_layout.addRow("Sheet大小 (像素):", self.atlas_size_spinbox)
        
        # FPS间隔
        fps_layout = QHBoxLayout()
        self.fps_spinbox = QSpinBox()
        self.fps_spinbox.setRange(1, 120)
        self.fps_spinbox.setValue(30)
        self.fps_spinbox.setSingleStep(5)
        fps_layout.addWidget(self.fps_spinbox)
        
        self.fps_slider = QSlider(Qt.Horizontal)
        self.fps_slider.setRange(1, 120)
        self.fps_slider.setValue(30)
        self.fps_slider.setTickPosition(QSlider.TicksBelow)
        self.fps_slider.setTickInterval(10)
        self.fps_slider.sliderMoved.connect(lambda v: self.fps_spinbox.setValue(v))
        self.fps_spinbox.valueChanged.connect(lambda v: self.fps_slider.setValue(v))
        fps_layout.addWidget(self.fps_slider)
        
        param_layout.addRow("帧间隔 (FPS数):", fps_layout)
        
        # 输出目录
        output_layout = QHBoxLayout()
        self.output_edit = QLineEdit()
        self.output_edit.setText(self.config['output_directory'])
        output_layout.addWidget(self.output_edit)
        
        output_btn = QPushButton("...")
        output_btn.setMaximumWidth(40)
        output_btn.clicked.connect(self.browse_output)
        output_layout.addWidget(output_btn)
        
        param_layout.addRow("输出目录:", output_layout)
        
        param_group.setLayout(param_layout)
        left_panel.addWidget(param_group)
        
        # 进度显示
        progress_group = QGroupBox("转换进度")
        progress_layout = QVBoxLayout()
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        progress_layout.addWidget(self.progress_bar)
        
        self.status_text = QTextEdit()
        self.status_text.setReadOnly(True)
        self.status_text.setMaximumHeight(100)
        self.status_text.setStyleSheet("""
            QTextEdit {
                background-color: white;
                border: 1px solid #ccc;
                border-radius: 3px;
                font-family: 'Courier New';
                font-size: 10px;
            }
        """)
        progress_layout.addWidget(self.status_text)
        
        progress_group.setLayout(progress_layout)
        left_panel.addWidget(progress_group)
        
        # 启动按钮
        start_btn = QPushButton("▶️ 开始转换")
        start_btn.setMinimumHeight(50)
        start_btn.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                font-size: 16px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #0b7dda;
            }
        """)
        start_btn.clicked.connect(self.start_conversion)
        self.start_btn = start_btn
        left_panel.addWidget(start_btn)
        
        left_panel.addStretch()
        
        # 右侧面板 - 信息和帮助
        right_panel = QVBoxLayout()
        
        # 标签页
        tabs = QTabWidget()
        
        # 动画预览标签
        animation_widget = QWidget()
        animation_layout = QVBoxLayout()
        
        animation_title = QLabel("动画预览")
        animation_title.setFont(QFont("Arial", 12, QFont.Bold))
        animation_layout.addWidget(animation_title)
        
        # 背景色选择
        bg_layout = QHBoxLayout()
        bg_label = QLabel("背景:")
        bg_layout.addWidget(bg_label)
        
        self.bg_button_group = QButtonGroup()
        self.bg_black = QRadioButton("黑底")
        self.bg_white = QRadioButton("白底")
        self.bg_black.setChecked(True)
        self.bg_button_group.addButton(self.bg_black)
        self.bg_button_group.addButton(self.bg_white)
        self.bg_black.toggled.connect(self.update_animation_background)
        
        bg_layout.addWidget(self.bg_black)
        bg_layout.addWidget(self.bg_white)
        bg_layout.addStretch()
        animation_layout.addLayout(bg_layout)
        
        # 动画显示区域
        self.animation_label = QLabel()
        self.animation_label.setMinimumSize(400, 400)
        self.animation_label.setMaximumSize(500, 500)
        self.animation_label.setAlignment(Qt.AlignCenter)
        self.animation_label.setStyleSheet("""
            QLabel {
                background-color: black;
                border: 2px solid #ccc;
                border-radius: 5px;
            }
        """)
        self.animation_label.setText("转换完成后显示动画预览")
        animation_layout.addWidget(self.animation_label)
        
        # 播放控制
        control_layout = QHBoxLayout()
        self.play_btn = QPushButton("▶ 播放")
        self.play_btn.setEnabled(False)
        self.play_btn.clicked.connect(self.toggle_animation)
        control_layout.addWidget(self.play_btn)
        
        self.speed_label = QLabel("速度:")
        control_layout.addWidget(self.speed_label)
        self.speed_slider = QSlider(Qt.Horizontal)
        self.speed_slider.setRange(1, 10)
        self.speed_slider.setValue(5)
        self.speed_slider.setEnabled(False)
        control_layout.addWidget(self.speed_slider)
        
        animation_layout.addLayout(control_layout)
        animation_widget.setLayout(animation_layout)
        tabs.addTab(animation_widget, "🎬 动画")
        
        # 参数预览标签
        preview_widget = QWidget()
        preview_layout = QVBoxLayout()
        
        preview_title = QLabel("参数计算结果")
        preview_title.setFont(QFont("Arial", 12, QFont.Bold))
        preview_layout.addWidget(preview_title)
        
        self.preview_text = QTextEdit()
        self.preview_text.setReadOnly(True)
        self.preview_text.setStyleSheet("""
            QTextEdit {
                background-color: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 3px;
                font-family: 'Courier New';
                font-size: 11px;
            }
        """)
        self.frame_size_spinbox.valueChanged.connect(self.update_preview)
        self.atlas_size_spinbox.valueChanged.connect(self.update_preview)
        preview_layout.addWidget(self.preview_text)
        
        preview_widget.setLayout(preview_layout)
        tabs.addTab(preview_widget, "📊 预览")
        
        # 帮助标签
        help_widget = QWidget()
        help_layout = QVBoxLayout()
        
        help_text = QTextEdit()
        help_text.setReadOnly(True)
        help_text.setStyleSheet("""
            QTextEdit {
                background-color: white;
                border: 1px solid #ddd;
                border-radius: 3px;
                font-family: 'Arial';
                font-size: 11px;
            }
        """)
        help_content = """
<h3>使用说明</h3>

<b>1. 选择视频</b>
• 点击"浏览"按钮选择视频文件
• 或直接拖拽视频文件到输入框

<b>2. 调整参数</b>
• 预设配置: 选择预定义的配置
• 单帧大小: 每张小图的尺寸 (64-1024)
• Sheet大小: 总的Sprite Sheet尺寸 (512-2048)
• 帧间隔: 多少帧提取一张 (越小越流畅)

<b>3. 开始转换</b>
• 点击"开始转换"按钮
• 等待转换完成
• 输出文件在output目录

<b>4. 查看动画预览</b>
• 转换完成后切换到"动画"标签页
• 选择黑底或白底
• 点击播放按钮查看效果
        """
        help_text.setHtml(help_content)
        help_layout.addWidget(help_text)
        
        help_widget.setLayout(help_layout)
        tabs.addTab(help_widget, "❓ 帮助")
        
        # 常见预设标签
        presets_widget = QWidget()
        presets_layout = QVBoxLayout()
        
        presets_text = QTextEdit()
        presets_text.setReadOnly(True)
        presets_text.setStyleSheet("""
            QTextEdit {
                background-color: white;
                border: 1px solid #ddd;
                border-radius: 3px;
                font-family: 'Courier New';
                font-size: 10px;
            }
        """)
        
        preset_content = "<h3>预设配置详情</h3><pre>"
        for preset_name, preset_config in self.config['presets'].items():
            preset_content += f"\n【{preset_name}】\n"
            preset_content += f"  帧大小: {preset_config['frame_size']}x{preset_config['frame_size']}\n"
            preset_content += f"  Sheet大小: {preset_config['atlas_size']}x{preset_config['atlas_size']}\n"
            preset_content += f"  帧间隔: {preset_config['fps_interval']}\n"
            preset_content += f"  说明: {preset_config.get('description', 'N/A')}\n"
        preset_content += "</pre>"
        presets_text.setHtml(preset_content)
        presets_layout.addWidget(presets_text)
        
        presets_widget.setLayout(presets_layout)
        tabs.addTab(presets_widget, "⚙️ 预设")
        
        right_panel.addWidget(tabs)
        
        # 合并左右面板
        h_layout = QHBoxLayout()
        h_layout.addLayout(left_panel, 6)
        h_layout.addLayout(right_panel, 4)
        main_layout.addLayout(h_layout)
        
        # 初始化动画相关
        self.animation_timer = QTimer()
        self.animation_timer.timeout.connect(self.update_animation_frame)
        self.current_animation_frame = 0
        self.animation_frames = []
        self.is_playing = False
        
        # 初始化
        self.update_preview()
        self.on_preset_changed()
    
    def update_animation_background(self):
        """更新动画背景色"""
        if self.bg_black.isChecked():
            self.animation_label.setStyleSheet("""
                QLabel {
                    background-color: black;
                    border: 2px solid #ccc;
                    border-radius: 5px;
                }
            """)
        else:
            self.animation_label.setStyleSheet("""
                QLabel {
                    background-color: white;
                    border: 2px solid #ccc;
                    border-radius: 5px;
                }
            """)
    
    def load_animation_frames(self, output_dir):
        """加载生成的序列帧"""
        try:
            frames_dir = os.path.join(output_dir, 'frames')
            if not os.path.exists(frames_dir):
                self.add_log("未找到frames目录")
                return False
            
            # 加载所有帧
            frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
            if not frame_files:
                self.add_log("未找到序列帧图片")
                return False
            
            self.animation_frames = []
            for frame_file in frame_files:
                frame_path = os.path.join(frames_dir, frame_file)
                img = Image.open(frame_path)
                # 转换为QPixmap
                img_rgb = img.convert('RGB')
                data = img_rgb.tobytes('raw', 'RGB')
                qimg = QImage(data, img_rgb.width, img_rgb.height, QImage.Format_RGB888)
                pixmap = QPixmap.fromImage(qimg)
                # 缩放到显示区域
                pixmap = pixmap.scaled(400, 400, Qt.KeepAspectRatio, Qt.SmoothTransformation)
                self.animation_frames.append(pixmap)
            
            self.add_log(f"✓ 已加载 {len(self.animation_frames)} 张序列帧")
            
            # 显示第一帧
            if self.animation_frames:
                self.animation_label.setPixmap(self.animation_frames[0])
                self.play_btn.setEnabled(True)
                self.speed_slider.setEnabled(True)
            
            return True
            
        except Exception as e:
            self.add_log(f"加载动画失败: {e}")
            return False
    
    def toggle_animation(self):
        """切换播放/暂停"""
        if self.is_playing:
            self.animation_timer.stop()
            self.play_btn.setText("▶ 播放")
            self.is_playing = False
        else:
            # 计算播放速度（FPS）
            speed = self.speed_slider.value()
            fps = speed * 2  # 1-10 对应 2-20 FPS
            interval = 1000 // fps  # 毫秒
            
            self.animation_timer.start(interval)
            self.play_btn.setText("⏸ 暂停")
            self.is_playing = True
            self.add_log(f"播放速度: {fps} FPS")
    
    def update_animation_frame(self):
        """更新动画帧"""
        if not self.animation_frames:
            return
        
        self.animation_label.setPixmap(self.animation_frames[self.current_animation_frame])
        self.current_animation_frame = (self.current_animation_frame + 1) % len(self.animation_frames
• 标准: 平衡方案 (256x256, 30fps)
• 低帧率: 节省空间 (256x256, 60fps)
• 高分辨率: 最高质量 (512x512, 30fps)
• 小图标: UI动画 (64x64, 60fps)

<b>输出文件</b>
• spritesheet_000.png: Sprite Sheet图像
• spritesheet.json: 元数据文件
• frames/: 提取的原始帧

<b>更多信息</b>
详见项目目录中的 GETTING_STARTED.md
        """
        help_text.setHtml(help_content)
        help_layout.addWidget(help_text)
        
        help_widget.setLayout(help_layout)
        tabs.addTab(help_widget, "❓ 帮助")
        
        # 常见预设标签
        presets_widget = QWidget()
        presets_layout = QVBoxLayout()
        
        presets_text = QTextEdit()
        presets_text.setReadOnly(True)
        presets_text.setStyleSheet("""
            QTextEdit {
                background-color: white;
                border: 1px solid #ddd;
                border-radius: 3px;
                font-family: 'Courier New';
                font-size: 10px;
            }
        """)
        
        preset_content = "<h3>预设配置详情</h3><pre>"
        for preset_name, preset_config in self.config['presets'].items():
            preset_content += f"\n【{preset_name}】\n"
            preset_content += f"  帧大小: {preset_config['frame_size']}x{preset_config['frame_size']}\n"
            preset_content += f"  Sheet大小: {preset_config['atlas_size']}x{preset_config['atlas_size']}\n"
            preset_content += f"  帧间隔: {preset_config['fps_interval']}\n"
            preset_content += f"  说明: {preset_config.get('description', 'N/A')}\n"
        preset_content += "</pre>"
        presets_text.setHtml(preset_content)
        presets_layout.addWidget(presets_text)
        
        presets_widget.setLayout(presets_layout)
        tabs.addTab(presets_widget, "⚙️ 预设")
        
        right_panel.addWidget(tabs)
        
        # 合并左右面板
        h_layout = QHBoxLayout()
        h_layout.addLayout(left_panel, 6)
        h_layout.addLayout(right_panel, 4)
        main_layout.addLayout(h_layout)
        
        # 初始化
        self.update_preview()
        self.on_preset_changed()
    
    def update_preview(self):
        """更新参数预览"""
        frame_size = self.frame_size_spinbox.value()
        atlas_size = self.atlas_size_spinbox.value()
        fps_interval = self.fps_spinbox.value()
        
        frames_per_row = atlas_size // frame_size
        frames_per_sheet = frames_per_row ** 2
        
        preview = f"""
【参数计算结果】

输入参数:
  • 单帧大小: {frame_size} × {frame_size} 像素
  • Sheet大小: {atlas_size} × {atlas_size} 像素
  • 帧间隔: {fps_interval} FPS

计算结果:
  • 一行帧数: {frames_per_row} 个
  • 每张Sheet: {frames_per_sheet} 张帧
  • 排列方式: {frames_per_row} × {frames_per_row} 网格

存储估算（每张Sheet）:
  • PNG文件大小: ~{atlas_size * atlas_size * 3 // (1024*1024)}-{atlas_size * atlas_size * 4 // (1024*1024)} MB（取决于压缩率）
  • 可容纳帧数: {frames_per_sheet} 张

说明:
  ✓ 参数范围合理
  ✓ 可用于游戏开发
  ✓ 导出为标准JSON元数据
        """
        
        self.preview_text.setText(preview)
    
    def on_preset_changed(self):
        """预设更改时更新参数"""
        preset_name = self.preset_combo.currentText()
        if preset_name in self.config['presets']:
            preset = self.config['presets'][preset_name]
            self.frame_size_spinbox.setValue(preset['frame_size'])
            self.atlas_size_spinbox.setValue(preset['atlas_size'])
            self.fps_spinbox.setValue(preset['fps_interval'])
    
    def show_preset_info(self):
        """显示预设信息"""
        preset_name = self.preset_combo.currentText()
        preset = self.config['presets'].get(preset_name, {})
        
        info = f"""
预设: {preset_name}

配置:
  • 单帧大小: {preset.get('frame_size', 'N/A')}x{preset.get('frame_size', 'N/A')}
  • Sheet大小: {preset.get('atlas_size', 'N/A')}x{preset.get('atlas_size', 'N/A')}
  • 帧间隔: {preset.get('fps_interval', 'N/A')}

说明: {preset.get('description', 'N/A')}

适用场景:
  此预设已针对常见使用场景优化
        """
        
        QMessageBox.information(self, "预设信息", info)
    
    def brow
            # 加载动画预览
            self.add_log("\n正在加载动画预览...")
            if self.load_animation_frames(output_dir):
                self.add_log("✓ 动画预览已加载，切换到"动画"标签页查看")
            
            QMessageBox.information(
                self,
                "成功",
                f"转换完成！\n输出目录: {os.path.abspath(output_dir)}\n\n切换到"动画"标签页可查看预览
            "选择视频文件",
            "",
            "视频文件 (*.mp4 *.avi *.mov *.mkv *.flv);;所有文件 (*.*)"
        )
        
        if file_path:
            self.video_display.setText(file_path)
            self.add_log(f"选择视频: {file_path}")
    
    def browse_output(self):
        """浏览输出目录"""
        dir_path = QFileDialog.getExistingDirectory(
            self,
            "选择输出目录"
        )
        
        if dir_path:
            self.output_edit.setText(dir_path)
    
    def dragEnterEvent(self, event: QDragEnterEvent):
        """处理拖拽进入"""
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
    
    def dropEvent(self, event):
        """处理拖拽放下"""
        urls = event.mimeData().urls()
        if urls:
            file_path = urls[0].toLocalFile()
            if os.path.isfile(file_path):
                self.video_display.setText(file_path)
                self.add_log(f"拖拽视频: {file_path}")
    
    def add_log(self, message):
        """添加日志"""
        self.status_text.append(message)
        # 滚动到底部
        cursor = self.status_text.textCursor()
        cursor.movePosition(cursor.End)
        self.status_text.setTextCursor(cursor)
    
    def start_conversion(self):
        """开始转换"""
        video_path = self.video_display.text()
        
        if not video_path:
            QMessageBox.warning(self, "错误", "请选择视频文件")
            return
        
        if not os.path.exists(video_path):
            QMessageBox.warning(self, "错误", f"视频文件不存在: {video_path}")
            return
        
        output_dir = self.output_edit.text()
        frame_size = self.frame_size_spinbox.value()
        atlas_size = self.atlas_size_spinbox.value()
        fps_interval = self.fps_spinbox.value()
        
        # 清空日志
        self.status_text.clear()
        self.add_log(f"开始转换...")
        self.add_log(f"视频: {video_path}")
        self.add_log(f"参数: frame_size={frame_size}, atlas_size={atlas_size}, fps_interval={fps_interval}")
        
        # 禁用按钮
        self.start_btn.setEnabled(False)
        
        # 创建转换器
        converter = VideoToSpriteSheet(
            video_path=video_path,
            output_dir=output_dir,
            frame_size=frame_size,
            atlas_size=atlas_size,
            fps_interval=fps_interval
        )
        
        # 创建工作线程
        self.worker = ConversionWorker(converter)
        self.worker.finished.connect(self.on_conversion_finished)
        self.worker.start()
    
    def on_conversion_finished(self, success, message):
        """转换完成"""
        self.add_log(message)
        self.start_btn.setEnabled(True)
        
        if success:
            output_dir = self.output_edit.text()
            QMessageBox.information(
                self,
                "成功",
                f"转换完成！\n输出目录: {os.path.abspath(output_dir)}"
            )


def main():
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    window = VideoToSpriteSheetGUI()
    window.show()
    
    sys.exit(app.exec_())


if __name__ == '__main__':
    main()
