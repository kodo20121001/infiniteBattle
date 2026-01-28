"""
Video to Sprite Sheet - GUI Version
PyQt5 interface with drag-drop, parameter adjustment, and animation preview
"""

import sys
import json
import os
from pathlib import Path
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QSpinBox, QDoubleSpinBox, QComboBox, QPushButton, QFileDialog,
    QProgressBar, QMessageBox, QGroupBox, QFormLayout, QTextEdit,
    QSlider, QTabWidget, QRadioButton, QButtonGroup, QDialog, QScrollArea, QGridLayout
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QTimer, QRect, QPoint
from PyQt5.QtGui import QPixmap, QImage, QPainter, QPen, QColor, QIcon
from PIL import Image
import traceback

from main import VideoToSpriteSheet


class RangeSlider(QWidget):
    """Custom double-handle range slider"""
    rangeChanged = pyqtSignal(int, int)
    
    def __init__(self, orientation=Qt.Horizontal, parent=None):
        super().__init__(parent)
        self.orientation = orientation
        self.min_val = 0
        self.max_val = 100
        self.low = 0
        self.high = 100
        self.pressing_low = False
        self.pressing_high = False
        
        if orientation == Qt.Horizontal:
            self.setFixedHeight(30)
        else:
            self.setFixedWidth(30)
    
    def setRange(self, min_val, max_val):
        self.min_val = min_val
        self.max_val = max_val
        self.update()
    
    def setLow(self, value):
        self.low = max(self.min_val, min(value, self.high - 1))
        self.update()
    
    def setHigh(self, value):
        self.high = max(self.low + 1, min(value, self.max_val))
        self.update()
    
    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        if self.orientation == Qt.Horizontal:
            # Draw track
            track_y = self.height() // 2
            painter.setPen(QPen(QColor(200, 200, 200), 3))
            painter.drawLine(0, track_y, self.width(), track_y)
            
            # Draw range
            low_x = self.val_to_pos(self.low)
            high_x = self.val_to_pos(self.high)
            painter.setPen(QPen(QColor(0, 120, 215), 6))
            painter.drawLine(low_x, track_y, high_x, track_y)
            
            # Draw handles
            painter.setPen(QPen(QColor(0, 0, 0), 2))
            painter.setBrush(QColor(255, 255, 255))
            painter.drawEllipse(low_x - 8, track_y - 8, 16, 16)
            painter.drawEllipse(high_x - 8, track_y - 8, 16, 16)
        else:
            # Draw track
            track_x = self.width() // 2
            painter.setPen(QPen(QColor(200, 200, 200), 3))
            painter.drawLine(track_x, 0, track_x, self.height())
            
            # Draw range
            low_y = self.val_to_pos(self.low)
            high_y = self.val_to_pos(self.high)
            painter.setPen(QPen(QColor(0, 120, 215), 6))
            painter.drawLine(track_x, low_y, track_x, high_y)
            
            # Draw handles
            painter.setPen(QPen(QColor(0, 0, 0), 2))
            painter.setBrush(QColor(255, 255, 255))
            painter.drawEllipse(track_x - 8, low_y - 8, 16, 16)
            painter.drawEllipse(track_x - 8, high_y - 8, 16, 16)
    
    def val_to_pos(self, value):
        if self.orientation == Qt.Horizontal:
            track_len = self.width()
            ratio = (value - self.min_val) / (self.max_val - self.min_val)
            return int(ratio * track_len)
        else:
            track_len = self.height()
            ratio = (value - self.min_val) / (self.max_val - self.min_val)
            return int(ratio * track_len)
    
    def pos_to_val(self, pos):
        if self.orientation == Qt.Horizontal:
            track_len = self.width()
            ratio = pos / track_len
        else:
            track_len = self.height()
            ratio = pos / track_len
        
        value = self.min_val + ratio * (self.max_val - self.min_val)
        return int(max(self.min_val, min(self.max_val, value)))
    
    def mousePressEvent(self, event):
        if self.orientation == Qt.Horizontal:
            pos = event.pos().x()
        else:
            pos = event.pos().y()
        
        low_pos = self.val_to_pos(self.low)
        high_pos = self.val_to_pos(self.high)
        
        if abs(pos - low_pos) < abs(pos - high_pos):
            self.pressing_low = True
        else:
            self.pressing_high = True
    
    def mouseMoveEvent(self, event):
        if self.pressing_low or self.pressing_high:
            if self.orientation == Qt.Horizontal:
                pos = event.pos().x()
            else:
                pos = event.pos().y()
            
            value = self.pos_to_val(pos)
            
            if self.pressing_low:
                self.setLow(value)
            else:
                self.setHigh(value)
            
            self.rangeChanged.emit(self.low, self.high)
    
    def mouseReleaseEvent(self, event):
        self.pressing_low = False
        self.pressing_high = False


class FrameEditorDialog(QDialog):
    """Frame trim editor dialog with slider controls"""
    def __init__(self, frame_path, trim_info, original_size, parent=None):
        super().__init__(parent)
        self.frame_path = frame_path
        self.trim_info = trim_info.copy()
        self.original_size = original_size
        
        self.setWindowTitle(f"Edit Frame - {os.path.basename(frame_path)}")
        self.setModal(True)
        self.resize(900, 700)
        
        # Load image
        self.load_image()
        
        # Create UI
        self.init_ui()
        
        # Update display
        self.update_display()
        self.update_slider_sizes()
    
    def load_image(self):
        """Load frame image"""
        # Load trimmed frame
        frame_img = Image.open(self.frame_path)
        if frame_img.mode != 'RGBA':
            frame_img = frame_img.convert('RGBA')
        
        # Create canvas with original size and gray background
        canvas = Image.new('RGBA', (self.original_size, self.original_size), (200, 200, 200, 255))
        
        # Paste trimmed frame at trim position
        canvas.paste(frame_img, (self.trim_info['x'], self.trim_info['y']), frame_img)
        
        # Convert to QPixmap
        data = canvas.tobytes('raw', 'RGBA')
        qimg = QImage(data, canvas.width, canvas.height, QImage.Format_RGBA8888)
        self.canvas_pixmap = QPixmap.fromImage(qimg)
    
    def init_ui(self):
        """Initialize UI with range sliders"""
        main_layout = QHBoxLayout()
        
        # Left: vertical range slider
        self.v_range_slider = RangeSlider(Qt.Vertical)
        self.v_range_slider.setRange(0, self.original_size)
        self.v_range_slider.setLow(self.trim_info['y'])
        self.v_range_slider.setHigh(self.trim_info['y'] + self.trim_info['h'])
        self.v_range_slider.rangeChanged.connect(self.on_vertical_range_changed)
        main_layout.addWidget(self.v_range_slider)
        
        # Right: container with horizontal slider and image
        right_container = QVBoxLayout()
        
        # Horizontal range slider for left/right
        self.h_range_slider = RangeSlider(Qt.Horizontal)
        self.h_range_slider.setRange(0, self.original_size)
        self.h_range_slider.setLow(self.trim_info['x'])
        self.h_range_slider.setHigh(self.trim_info['x'] + self.trim_info['w'])
        self.h_range_slider.rangeChanged.connect(self.on_horizontal_range_changed)
        right_container.addWidget(self.h_range_slider)
        
        # Image display
        self.image_label = QLabel()
        self.image_label.setFixedSize(600, 600)
        self.image_label.setAlignment(Qt.AlignCenter)
        right_container.addWidget(self.image_label)
        
        main_layout.addLayout(right_container)
        
        # Bottom section
        bottom_layout = QVBoxLayout()
        bottom_layout.addLayout(main_layout)
        
        # Info label
        self.info_label = QLabel()
        bottom_layout.addWidget(self.info_label)
        
        # Buttons
        button_layout = QHBoxLayout()
        ok_btn = QPushButton("OK")
        ok_btn.clicked.connect(self.accept)
        cancel_btn = QPushButton("Cancel")
        cancel_btn.clicked.connect(self.reject)
        button_layout.addStretch()
        button_layout.addWidget(ok_btn)
        button_layout.addWidget(cancel_btn)
        bottom_layout.addLayout(button_layout)
        
        self.setLayout(bottom_layout)
    
    def on_horizontal_range_changed(self, left, right):
        """Horizontal range slider changed"""
        self.trim_info['x'] = left
        self.trim_info['w'] = right - left
        self.update_display()
        self.update_slider_sizes()
    
    def on_vertical_range_changed(self, top, bottom):
        """Vertical range slider changed"""
        self.trim_info['y'] = top
        self.trim_info['h'] = bottom - top
        self.update_display()
        self.update_slider_sizes()
    
    def update_slider_sizes(self):
        """Update slider sizes to match image display"""
        # Image display area is 600x600
        scale = min(580 / self.original_size, 580 / self.original_size)
        scaled_size = int(self.original_size * scale)
        
        # Update slider sizes to match scaled image
        self.h_range_slider.setFixedWidth(scaled_size)
        self.v_range_slider.setFixedHeight(scaled_size)
        
        # Since h_slider and image are in the same container, they auto-align!
    
    def update_display(self):
        """Update display with trim rectangle"""
        # Calculate scale to fit in label
        scale = min(580 / self.original_size, 580 / self.original_size)
        scaled_size = int(self.original_size * scale)
        
        # Scale canvas
        scaled_pixmap = self.canvas_pixmap.scaled(
            scaled_size, scaled_size,
            Qt.KeepAspectRatio, Qt.SmoothTransformation
        )
        
        # Draw trim rectangle
        painter = QPainter(scaled_pixmap)
        pen = QPen(QColor(255, 0, 0), 3)
        painter.setPen(pen)
        
        rect = QRect(
            int(self.trim_info['x'] * scale),
            int(self.trim_info['y'] * scale),
            int(self.trim_info['w'] * scale),
            int(self.trim_info['h'] * scale)
        )
        painter.drawRect(rect)
        painter.end()
        
        self.image_label.setPixmap(scaled_pixmap)
        self.info_label.setText(
            f"Trim Area: x={self.trim_info['x']}, y={self.trim_info['y']}, "
            f"w={self.trim_info['w']}, h={self.trim_info['h']}"
        )
    
    def get_trim_info(self):
        """Get updated trim info"""
        return self.trim_info
    
    def save_cropped_frame(self):
        """Save the re-cropped frame based on new trim info"""
        # Crop the new trim area from the canvas
        # The canvas has the original image pasted at the old trim position
        # We need to crop the new trim rectangle
        canvas_img = Image.open(self.frame_path)
        if canvas_img.mode != 'RGBA':
            canvas_img = canvas_img.convert('RGBA')
        
        # Create full-size canvas
        full_canvas = Image.new('RGBA', (self.original_size, self.original_size), (0, 0, 0, 0))
        
        # We need to get the original untrimmed frame
        # Since we only have the trimmed frame, we need to work differently
        # Just crop the new area directly and save
        
        # For now, we'll update the trim_info and let the sprite sheet generation handle it
        # The trim_info update is enough because generate_spritesheet will use it
        pass


class ConversionWorker(QThread):
    """Conversion worker thread"""
    finished = pyqtSignal(bool, str)
    
    def __init__(self, converter):
        super().__init__()
        self.converter = converter
    
    def run(self):
        try:
            success = self.converter.run()
            if success:
                self.finished.emit(True, "Conversion completed!")
            else:
                self.finished.emit(False, "Conversion failed")
        except Exception as e:
            self.finished.emit(False, f"Error: {str(e)}\n{traceback.format_exc()}")


class VideoToSpriteSheetGUI(QMainWindow):
    """Main window"""
    
    def __init__(self):
        super().__init__()
        self.config = self.load_config()
        self.init_ui()
        self.setAcceptDrops(True)
    
    def load_config(self):
        """Load config file"""
        try:
            with open('config.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {
                'presets': {
                    'Standard': {'frame_size': 256, 'atlas_size': 1024, 'fps_interval': 30}
                },
                'default_preset': 'Standard',
                'output_directory': 'output'
            }
    
    def init_ui(self):
        """Initialize UI"""
        self.setWindowTitle("Video to Sprite Sheet - GUI")
        self.setGeometry(100, 100, 1200, 800)
        
        # Main widget
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        main_layout = QHBoxLayout(main_widget)
        
        # Left panel
        left_panel = QVBoxLayout()
        
        # Video file selection
        video_group = QGroupBox("Video File")
        video_layout = QVBoxLayout()
        
        self.video_display = QLineEdit()
        self.video_display.setPlaceholderText("Select or drag video file here...")
        self.video_display.setReadOnly(True)
        self.video_display.setMinimumHeight(40)
        video_layout.addWidget(self.video_display)
        
        button_layout = QHBoxLayout()
        browse_btn = QPushButton("Browse")
        browse_btn.clicked.connect(self.browse_video)
        button_layout.addWidget(browse_btn)
        
        clear_btn = QPushButton("Clear")
        clear_btn.clicked.connect(lambda: self.video_display.clear())
        button_layout.addWidget(clear_btn)
        
        video_layout.addLayout(button_layout)
        video_group.setLayout(video_layout)
        left_panel.addWidget(video_group)
        
        # Parameters
        param_group = QGroupBox("Parameters")
        param_layout = QFormLayout()
        
        # Compress ratio
        self.compress_ratio_spinbox = QDoubleSpinBox()
        self.compress_ratio_spinbox.setRange(0.5, 1.0)
        self.compress_ratio_spinbox.setValue(self.config.get('default_compress_ratio', 1.0))
        self.compress_ratio_spinbox.setSingleStep(0.1)
        self.compress_ratio_spinbox.setDecimals(1)
        param_layout.addRow("Compress Ratio:", self.compress_ratio_spinbox)
        
        # Atlas size
        self.atlas_size_spinbox = QSpinBox()
        self.atlas_size_spinbox.setRange(512, 2048)
        self.atlas_size_spinbox.setValue(self.config.get('default_atlas_size', 1024))
        self.atlas_size_spinbox.setSingleStep(256)
        param_layout.addRow("Atlas Size (px):", self.atlas_size_spinbox)
        
        # FPS interval
        self.fps_spinbox = QSpinBox()
        self.fps_spinbox.setRange(1, 120)
        self.fps_spinbox.setValue(self.config.get('default_fps_interval', 30))
        self.fps_spinbox.setSingleStep(5)
        param_layout.addRow("FPS Interval:", self.fps_spinbox)
        
        # Output directory
        output_layout = QHBoxLayout()
        self.output_edit = QLineEdit()
        self.output_edit.setText(self.config['output_directory'])
        output_layout.addWidget(self.output_edit)
        
        output_btn = QPushButton("...")
        output_btn.setMaximumWidth(40)
        output_btn.clicked.connect(self.browse_output)
        output_layout.addWidget(output_btn)
        
        param_layout.addRow("Output Dir:", output_layout)
        
        param_group.setLayout(param_layout)
        left_panel.addWidget(param_group)
        
        # Progress
        progress_group = QGroupBox("Progress")
        progress_layout = QVBoxLayout()
        
        self.status_text = QTextEdit()
        self.status_text.setReadOnly(True)
        self.status_text.setMaximumHeight(150)
        progress_layout.addWidget(self.status_text)
        
        progress_group.setLayout(progress_layout)
        left_panel.addWidget(progress_group)
        
        # Extract button
        self.start_btn = QPushButton("Extract Frames")
        self.start_btn.setMinimumHeight(50)
        self.start_btn.clicked.connect(self.start_extraction)
        left_panel.addWidget(self.start_btn)
        
        # Frame thumbnails
        frames_group = QGroupBox("Extracted Frames (Click to Edit)")
        frames_layout = QVBoxLayout()
        
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setMinimumHeight(200)
        scroll_area.setMaximumHeight(300)
        
        self.frames_widget = QWidget()
        self.frames_grid = QGridLayout(self.frames_widget)
        scroll_area.setWidget(self.frames_widget)
        
        frames_layout.addWidget(scroll_area)
        frames_group.setLayout(frames_layout)
        left_panel.addWidget(frames_group)
        
        # Generate button
        self.generate_btn = QPushButton("Generate Sprite Sheet")
        self.generate_btn.setMinimumHeight(50)
        self.generate_btn.setEnabled(False)
        self.generate_btn.clicked.connect(self.generate_spritesheet)
        left_panel.addWidget(self.generate_btn)
        
        left_panel.addStretch()
        
        # Right panel - Animation preview
        right_panel = QVBoxLayout()
        
        animation_group = QGroupBox("Animation Preview")
        animation_layout = QVBoxLayout()
        
        # Background selection
        bg_layout = QHBoxLayout()
        bg_label = QLabel("Background:")
        bg_layout.addWidget(bg_label)
        
        self.bg_button_group = QButtonGroup()
        self.bg_black = QRadioButton("Black")
        self.bg_white = QRadioButton("White")
        self.bg_black.setChecked(True)
        self.bg_button_group.addButton(self.bg_black)
        self.bg_button_group.addButton(self.bg_white)
        self.bg_black.toggled.connect(self.update_animation_background)
        
        bg_layout.addWidget(self.bg_black)
        bg_layout.addWidget(self.bg_white)
        bg_layout.addStretch()
        animation_layout.addLayout(bg_layout)
        
        # Animation display area
        self.animation_label = QLabel()
        self.animation_label.setMinimumSize(400, 400)
        self.animation_label.setMaximumSize(500, 500)
        self.animation_label.setAlignment(Qt.AlignCenter)
        self.animation_label.setStyleSheet("QLabel { background-color: black; border: 2px solid #ccc; border-radius: 5px; }")
        self.animation_label.setText("Animation preview will appear after conversion")
        animation_layout.addWidget(self.animation_label)
        
        # Playback controls
        control_layout = QHBoxLayout()
        self.play_btn = QPushButton("Play")
        self.play_btn.setEnabled(False)
        self.play_btn.clicked.connect(self.toggle_animation)
        control_layout.addWidget(self.play_btn)
        
        self.speed_label = QLabel("Speed:")
        control_layout.addWidget(self.speed_label)
        self.speed_slider = QSlider(Qt.Horizontal)
        self.speed_slider.setRange(1, 10)
        self.speed_slider.setValue(5)
        self.speed_slider.setEnabled(False)
        control_layout.addWidget(self.speed_slider)
        
        animation_layout.addLayout(control_layout)
        animation_group.setLayout(animation_layout)
        right_panel.addWidget(animation_group)
        
        right_panel.addStretch()
        
        # Combine panels
        main_layout.addLayout(left_panel, 6)
        main_layout.addLayout(right_panel, 4)
        
        # Initialize animation
        self.animation_timer = QTimer()
        self.animation_timer.timeout.connect(self.update_animation_frame)
        self.current_animation_frame = 0
        self.animation_frames = []
        self.is_playing = False
        
        # Frame data
        self.extracted_frames = []  # List of frame info dicts
        self.frame_buttons = []  # List of thumbnail buttons
    
    def update_animation_background(self):
        """Update animation background color"""
        if self.bg_black.isChecked():
            self.animation_label.setStyleSheet("QLabel { background-color: black; border: 2px solid #ccc; border-radius: 5px; }")
        else:
            self.animation_label.setStyleSheet("QLabel { background-color: white; border: 2px solid #ccc; border-radius: 5px; }")
    
    def load_animation_frames(self, output_dir):
        """Load generated sequence frames with trim information from JSON"""
        try:
            frames_dir = os.path.join(output_dir, 'frames')
            json_path = os.path.join(output_dir, 'spritesheet.json')
            
            if not os.path.exists(frames_dir):
                self.add_log("frames directory not found")
                return False
            
            if not os.path.exists(json_path):
                self.add_log("spritesheet.json not found")
                return False
            
            # Load JSON metadata
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
            except Exception as e:
                self.add_log(f"Failed to load JSON: {e}")
                return False
            
            # Load all frames with trim information
            frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
            if not frame_files:
                self.add_log("No frame images found")
                return False
            
            self.animation_frames = []
            for frame_file in frame_files:
                frame_path = os.path.join(frames_dir, frame_file)
                
                # Get frame info from JSON
                if frame_file not in metadata['frames']:
                    self.add_log(f"Frame {frame_file} not found in metadata, skipping")
                    continue
                
                frame_info = metadata['frames'][frame_file]
                source_size = frame_info['sourceSize']  # Original size
                sprite_source_size = frame_info['spriteSourceSize']  # Trim info
                
                # Create canvas with original size
                canvas = Image.new('RGBA', (source_size['w'], source_size['h']), (0, 0, 0, 0))
                
                # Load trimmed image
                trimmed_img = Image.open(frame_path)
                if trimmed_img.mode != 'RGBA':
                    trimmed_img = trimmed_img.convert('RGBA')
                
                # Paste trimmed image at correct position
                paste_pos = (sprite_source_size['x'], sprite_source_size['y'])
                canvas.paste(trimmed_img, paste_pos, trimmed_img)
                
                # Convert to QPixmap for display
                data = canvas.tobytes('raw', 'RGBA')
                qimg = QImage(data, canvas.width, canvas.height, QImage.Format_RGBA8888)
                pixmap = QPixmap.fromImage(qimg)
                
                # Scale to display area
                pixmap = pixmap.scaledToHeight(400, Qt.SmoothTransformation)
                self.animation_frames.append(pixmap)
            
            self.add_log(f"Loaded {len(self.animation_frames)} frames with trim information")
            
            # Display first frame
            if self.animation_frames:
                self.animation_label.setPixmap(self.animation_frames[0])
                self.play_btn.setEnabled(True)
                self.speed_slider.setEnabled(True)
            
            return True
            
        except Exception as e:
            self.add_log(f"Failed to load animation: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def toggle_animation(self):
        """Toggle play/pause"""
        if self.is_playing:
            self.animation_timer.stop()
            self.play_btn.setText("Play")
            self.is_playing = False
        else:
            # Calculate playback speed (FPS)
            speed = self.speed_slider.value()
            fps = speed * 2  # 1-10 corresponds to 2-20 FPS
            interval = 1000 // fps  # milliseconds
            
            self.animation_timer.start(interval)
            self.play_btn.setText("Pause")
            self.is_playing = True
            self.add_log(f"Playback speed: {fps} FPS")
    
    def update_animation_frame(self):
        """Update animation frame"""
        if not self.animation_frames:
            return
        
        self.animation_label.setPixmap(self.animation_frames[self.current_animation_frame])
        self.current_animation_frame = (self.current_animation_frame + 1) % len(self.animation_frames)
    
    
    def browse_video(self):
        """Browse video file"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Select Video File", "",
            "Video Files (*.mp4 *.avi *.mov *.mkv *.flv);;All Files (*.*)"
        )
        
        if file_path:
            self.video_display.setText(file_path)
            self.add_log(f"Selected: {file_path}")
    
    def browse_output(self):
        """Browse output directory"""
        dir_path = QFileDialog.getExistingDirectory(self, "Select Output Directory")
        if dir_path:
            self.output_edit.setText(dir_path)
    
    def dragEnterEvent(self, event):
        """Handle drag enter"""
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
    
    def dropEvent(self, event):
        """Handle drop"""
        urls = event.mimeData().urls()
        if urls:
            file_path = urls[0].toLocalFile()
            if os.path.isfile(file_path):
                self.video_display.setText(file_path)
                self.add_log(f"Dropped: {file_path}")
    
    def add_log(self, message):
        """Add log message"""
        self.status_text.append(message)
        cursor = self.status_text.textCursor()
        cursor.movePosition(cursor.End)
        self.status_text.setTextCursor(cursor)
    
    def start_extraction(self):
        """Start frame extraction (Phase 1)"""
        video_path = self.video_display.text()
        
        if not video_path:
            QMessageBox.warning(self, "Error", "Please select a video file")
            return
        
        if not os.path.exists(video_path):
            QMessageBox.warning(self, "Error", f"Video file does not exist: {video_path}")
            return
        
        # Get video resolution
        video_resolution = VideoToSpriteSheet.get_video_resolution(video_path)
        if not video_resolution:
            QMessageBox.warning(self, "Error", f"Cannot read video: {video_path}")
            return
        
        original_width, original_height = video_resolution
        video_size = min(original_width, original_height)
        
        output_dir = self.output_edit.text()
        compress_ratio = self.compress_ratio_spinbox.value()
        fps_interval = self.fps_spinbox.value()
        
        # Calculate frame_size
        frame_size = int(video_size * compress_ratio)
        
        # Clear log
        self.status_text.clear()
        self.add_log(f"Starting frame extraction...")
        self.add_log(f"Video: {video_path}")
        self.add_log(f"Video resolution: {original_width}x{original_height}")
        self.add_log(f"Frame size: {frame_size} (compress_ratio={compress_ratio})")
        
        # Disable button
        self.start_btn.setEnabled(False)
        
        # Extract frames only
        try:
            converter = VideoToSpriteSheet(
                video_path=video_path,
                output_dir=output_dir,
                frame_size=frame_size,
                atlas_size=1024,  # Temporary, will use actual value in phase 2
                fps_interval=fps_interval
            )
            
            self.add_log("Extracting frames...")
            self.extracted_frames = converter.extract_frames()
            
            self.add_log(f"Extracted {len(self.extracted_frames)} frames")
            self.add_log("Frame extraction completed!")
            
            # Display thumbnails
            self.display_frame_thumbnails()
            
            # Enable generate button
            self.generate_btn.setEnabled(True)
            self.start_btn.setEnabled(True)
            
            QMessageBox.information(self, "Success", "Frame extraction completed!\nYou can now click frames to edit trim areas.")
            
        except Exception as e:
            self.add_log(f"Error: {str(e)}")
            self.start_btn.setEnabled(True)
            QMessageBox.critical(self, "Error", f"Frame extraction failed:\n{str(e)}")
    
    def display_frame_thumbnails(self):
        """Display frame thumbnails in grid"""
        # Clear existing thumbnails
        for btn in self.frame_buttons:
            btn.deleteLater()
        self.frame_buttons.clear()
        
        # Create thumbnails
        for idx, frame_info in enumerate(self.extracted_frames):
            frame_path = frame_info['path']
            
            # Load thumbnail
            img = Image.open(frame_path)
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Create thumbnail (80x80)
            img.thumbnail((80, 80))
            
            # Convert to QPixmap
            data = img.tobytes('raw', 'RGBA')
            qimg = QImage(data, img.width, img.height, QImage.Format_RGBA8888)
            pixmap = QPixmap.fromImage(qimg)
            
            # Create button
            btn = QPushButton()
            btn.setIcon(QIcon(pixmap))
            btn.setIconSize(pixmap.size())
            btn.setFixedSize(90, 90)
            btn.setToolTip(f"Frame {idx}")
            btn.clicked.connect(lambda checked, i=idx: self.edit_frame(i))
            
            # Add to grid
            row = idx // 4
            col = idx % 4
            self.frames_grid.addWidget(btn, row, col)
            self.frame_buttons.append(btn)
    
    def edit_frame(self, frame_index):
        """Edit frame trim area"""
        frame_info = self.extracted_frames[frame_index]
        
        dialog = FrameEditorDialog(
            frame_info['path'],
            frame_info['trim_info'],
            frame_info['original_size'],
            self
        )
        
        if dialog.exec_() == QDialog.Accepted:
            # Update trim info
            new_trim_info = dialog.get_trim_info()
            old_trim = self.extracted_frames[frame_index]['trim_info']
            
            # Calculate the adjustment: new trim relative to old trim
            # The frame image file contains the OLD trimmed area
            # We need to adjust coordinates
            self.extracted_frames[frame_index]['trim_info'] = new_trim_info
            
            # Recalculate trim relative to the original frame stored in the file
            self.recrop_frame(frame_index, old_trim, new_trim_info)
            
            # Update thumbnail
            self.display_frame_thumbnails()
            
            self.add_log(f"Frame {frame_index} trim updated: {new_trim_info}")
    
    def recrop_frame(self, frame_index, old_trim, new_trim):
        """Re-crop frame based on updated trim info"""
        frame_info = self.extracted_frames[frame_index]
        frame_path = frame_info['path']
        original_size = frame_info['original_size']
        
        # Load the currently saved trimmed image
        trimmed_img = Image.open(frame_path)
        if trimmed_img.mode != 'RGBA':
            trimmed_img = trimmed_img.convert('RGBA')
        
        # Reconstruct the full original frame by placing trimmed image at old position
        full_frame = Image.new('RGBA', (original_size, original_size), (0, 0, 0, 0))
        full_frame.paste(trimmed_img, (old_trim['x'], old_trim['y']), trimmed_img)
        
        # Now crop the new trim area from the full frame
        new_cropped = full_frame.crop((
            new_trim['x'],
            new_trim['y'],
            new_trim['x'] + new_trim['w'],
            new_trim['y'] + new_trim['h']
        ))
        
        # Save the new cropped image
        new_cropped.save(frame_path)
        
        self.add_log(f"Re-cropped frame {frame_index}: from {old_trim} to {new_trim}")
    
    def generate_spritesheet(self):
        """Generate sprite sheet (Phase 2)"""
        if not self.extracted_frames:
            QMessageBox.warning(self, "Error", "No frames extracted yet!")
            return
        
        output_dir = self.output_edit.text()
        atlas_size = self.atlas_size_spinbox.value()
        
        self.add_log("\nGenerating sprite sheet...")
        self.generate_btn.setEnabled(False)
        
        try:
            # Create converter (reuse config)
            converter = VideoToSpriteSheet(
                video_path=self.video_display.text(),
                output_dir=output_dir,
                frame_size=self.extracted_frames[0]['original_size'],
                atlas_size=atlas_size,
                fps_interval=1  # Not used in this phase
            )
            
            # Create sprite sheets with updated frame info
            sheets_info = converter.create_sprite_sheets(self.extracted_frames)
            
            # Generate metadata
            converter.generate_metadata(sheets_info, len(self.extracted_frames))
            
            self.add_log("Sprite sheet generation completed!")
            
            # Load animation preview
            self.add_log("\nLoading animation preview...")
            if self.load_animation_frames(output_dir):
                self.add_log("Animation preview loaded")
            
            self.generate_btn.setEnabled(True)
            
            QMessageBox.information(
                self, "Success",
                f"Sprite sheet generated!\nOutput directory: {os.path.abspath(output_dir)}"
            )
            
        except Exception as e:
            self.add_log(f"Error: {str(e)}")
            self.generate_btn.setEnabled(True)
            QMessageBox.critical(self, "Error", f"Sprite sheet generation failed:\n{str(e)}")
    
    def on_conversion_finished(self, success, message):
        """Conversion finished (legacy, not used in new workflow)"""
        self.add_log(message)
        self.start_btn.setEnabled(True)
        
        if success:
            output_dir = self.output_edit.text()
            
            # Load animation preview
            self.add_log("\nLoading animation preview...")
            if self.load_animation_frames(output_dir):
                self.add_log("Animation preview loaded")
            
            QMessageBox.information(
                self, "Success",
                f"Conversion completed!\nOutput directory: {os.path.abspath(output_dir)}\n\nAnimation preview is now available"
            )


def main():
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    window = VideoToSpriteSheetGUI()
    window.show()
    
    sys.exit(app.exec_())


if __name__ == '__main__':
    main()
