"""
视频转序列帧 & Sprite Sheet 生成工具
将视频按指定时间间隔提取帧，合并成Sprite Sheet，并生成JSON元数据
"""

import cv2
import os
import json
from PIL import Image
import math
from pathlib import Path
from rembg import remove


class VideoToSpriteSheet:
    def __init__(self, 
                 video_path: str,
                 output_dir: str = "output",
                 frame_size: int = 256,
                 atlas_size: int = 1024,
                 fps_interval: int = 30):
        """
        初始化转换器
        
        Args:
            video_path: 视频文件路径
            output_dir: 输出目录
            frame_size: 单个帧的大小（像素，正方形）
            atlas_size: Sprite Sheet的大小（像素，正方形）
            fps_interval: 帧间隔（每多少帧取一张，30fps视频的30表示1秒取1张）
        """
        self.video_path = video_path
        self.output_dir = output_dir
        self.frame_size = frame_size
        self.atlas_size = atlas_size
        self.fps_interval = fps_interval
        
        # 计算一张Sprite Sheet中能容纳的帧数
        self.frames_per_row = atlas_size // frame_size
        self.frames_per_sheet = self.frames_per_row ** 2
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        self.frames_dir = os.path.join(output_dir, "frames")
        os.makedirs(self.frames_dir, exist_ok=True)
        
        print(f"[初始化]")
        print(f"  视频: {video_path}")
        print(f"  单帧大小: {frame_size}x{frame_size}")
        print(f"  Atlas大小: {atlas_size}x{atlas_size}")
        print(f"  一行帧数: {self.frames_per_row}")
        print(f"  每张Sheet帧数: {self.frames_per_sheet}")
        print(f"  帧间隔: {fps_interval}帧")
        print()

    @staticmethod
    def get_video_resolution(video_path: str) -> tuple:
        """
        获取视频的原始分辨率
        返回: (width, height) 或 None如果无法打开视频
        """
        try:
            vidcap = cv2.VideoCapture(video_path)
            if not vidcap.isOpened():
                return None
            
            width = int(vidcap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(vidcap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            vidcap.release()
            
            return (width, height)
        except:
            return None

    def trim_image(self, image):
        """
        裁剪图片的透明边界
        返回: (裁剪后的图片, 裁剪信息{'x': int, 'y': int, 'w': int, 'h': int})
        """
        # 获取图片的alpha通道
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
        
        # 获取图片数据
        data = image.getdata()
        width, height = image.size
        
        # 找到非透明的边界
        left = width
        right = 0
        top = height
        bottom = 0
        
        for y in range(height):
            for x in range(width):
                # 检查该像素的alpha值
                if data[y * width + x][3] > 0:  # alpha > 0
                    left = min(left, x)
                    right = max(right, x)
                    top = min(top, y)
                    bottom = max(bottom, y)
        
        # 如果图片完全透明
        if left >= right or top >= bottom:
            return image.crop((0, 0, 0, 0)), {'x': 0, 'y': 0, 'w': 0, 'h': 0}
        
        # 裁剪图片
        trim_box = (left, top, right + 1, bottom + 1)
        trimmed = image.crop(trim_box)
        
        trim_info = {
            'x': left,
            'y': top,
            'w': trimmed.width,
            'h': trimmed.height
        }
        
        return trimmed, trim_info
    
    def extract_frames(self) -> list:
        """提取视频帧、去除背景并自动裁剪"""
        print("[第1步] 提取视频帧、去除背景并自动裁剪...")
        
        vidcap = cv2.VideoCapture(self.video_path)
        if not vidcap.isOpened():
            raise ValueError(f"无法打开视频: {self.video_path}")
        
        fps = vidcap.get(cv2.CAP_PROP_FPS)
        total_frames = int(vidcap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"  视频FPS: {fps}")
        print(f"  总帧数: {total_frames}")
        print(f"  正在处理帧（去除背景 + 自动裁剪）...")
        
        frame_list = []
        count = 0
        extracted = 0
        success, image = vidcap.read()
        
        while success:
            # 按间隔提取帧
            if count % self.fps_interval == 0:
                # 调整帧大小
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                resized = cv2.resize(image, (self.frame_size, self.frame_size))
                
                # 转换为PIL Image
                pil_image = Image.fromarray(resized).convert('RGB')
                
                # 使用rembg去除背景
                print(f"    处理第 {extracted + 1} 帧 (去除背景中...)")
                pil_image_no_bg = remove(pil_image)
                
                # 自动裁剪透明边界
                trimmed_image, trim_info = self.trim_image(pil_image_no_bg)
                
                # 保存裁剪后的帧
                frame_path = os.path.join(self.frames_dir, f"frame_{extracted:05d}.png")
                trimmed_image.save(frame_path)
                
                frame_list.append({
                    'index': extracted,
                    'path': frame_path,
                    'timestamp': count / fps,  # 时间戳（秒）
                    'original_size': self.frame_size,
                    'trim_info': trim_info
                })
                extracted += 1
            
            success, image = vidcap.read()
            count += 1
        
        vidcap.release()
        
        print(f"  提取完成: {extracted} 张帧（已去除背景并自动裁剪）")
        print(f"  时间: 0s - {frame_list[-1]['timestamp']:.2f}s")
        print()
        
        return frame_list

    def create_sprite_sheets(self, frame_list: list) -> dict:
        """创建Sprite Sheet（自动排列裁剪后的图片）"""
        print("[第2步] 生成Sprite Sheet（自动排列）...")
        
        sheets_info = []
        current_sheet = Image.new('RGBA', (self.atlas_size, self.atlas_size), color=(0, 0, 0, 0))
        current_x = 0
        current_y = 0
        max_height = 0
        sheet_frames = []
        sheet_idx = 0
        
        for frame_info in frame_list:
            # 加载裁剪后的图片
            frame_img = Image.open(frame_info['path']).convert('RGBA')
            frame_w = frame_img.width
            frame_h = frame_img.height
            
            # 如果该行放不下，换到下一行
            if current_x + frame_w > self.atlas_size and current_x > 0:
                current_x = 0
                current_y += max_height + 2  # 加2像素间距
                max_height = 0
            
            # 如果超出高度，创建新Sheet
            if current_y + frame_h > self.atlas_size:
                # 保存当前Sheet
                sheet_data = {
                    'index': sheet_idx,
                    'frames': sheet_frames
                }
                sheets_info.append(sheet_data)
                
                # 创建新Sheet
                sheet_path = os.path.join(self.output_dir, f"spritesheet_{sheet_idx:03d}.png")
                current_sheet.save(sheet_path)
                
                current_sheet = Image.new('RGBA', (self.atlas_size, self.atlas_size), color=(0, 0, 0, 0))
                current_x = 0
                current_y = 0
                max_height = 0
                sheet_frames = []
                sheet_idx += 1
                
                print(f"  Sheet {sheet_idx - 1}: {len(sheet_frames)} 帧 -> {sheet_path}")
            
            # 粘贴图片
            current_sheet.paste(frame_img, (current_x, current_y), frame_img)
            
            # 记录帧信息（TexturePacker格式）
            sheet_frames.append({
                'original_index': frame_info['index'],
                'frame': {
                    'x': current_x,
                    'y': current_y,
                    'w': frame_w,
                    'h': frame_h
                },
                'rotated': False,
                'trimmed': True,
                'spriteSourceSize': {
                    'x': frame_info['trim_info']['x'],
                    'y': frame_info['trim_info']['y'],
                    'w': frame_info['trim_info']['w'],
                    'h': frame_info['trim_info']['h']
                },
                'sourceSize': {
                    'w': frame_info['original_size'],
                    'h': frame_info['original_size']
                },
                'timestamp': frame_info['timestamp']
            })
            
            # 更新坐标
            current_x += frame_w + 2  # 加2像素间距
            max_height = max(max_height, frame_h)
        
        # 保存最后一张Sheet
        if sheet_frames:
            sheet_data = {
                'index': sheet_idx,
                'frames': sheet_frames
            }
            sheets_info.append(sheet_data)
            
            sheet_path = os.path.join(self.output_dir, f"spritesheet_{sheet_idx:03d}.png")
            current_sheet.save(sheet_path)
            
            print(f"  Sheet {sheet_idx}: {len(sheet_frames)} 帧 -> {sheet_path}")
        
        print()
        return sheets_info

    def generate_metadata(self, sheets_info: list, frame_count: int) -> dict:
        """生成TexturePacker格式的JSON元数据"""
        print("[第3步] 生成TexturePacker格式元数据...")
        
        # 为每个Sheet生成独立的JSON
        for sheet_data in sheets_info:
            sheet_idx = sheet_data['index']
            metadata = {
                'meta': {
                    'app': 'VideoToSpriteSheet',
                    'version': '1.0',
                    'image': f'spritesheet_{sheet_idx:03d}.png',
                    'format': 'RGBA8888',
                    'size': {
                        'w': self.atlas_size,
                        'h': self.atlas_size
                    },
                    'scale': '1'
                },
                'frames': {}
            }
            
            for frame_info in sheet_data['frames']:
                frame_name = f"frame_{frame_info['original_index']:05d}.png"
                
                metadata['frames'][frame_name] = {
                    'frame': {
                        'x': frame_info['frame']['x'],
                        'y': frame_info['frame']['y'],
                        'w': frame_info['frame']['w'],
                        'h': frame_info['frame']['h']
                    },
                    'rotated': frame_info['rotated'],
                    'trimmed': frame_info['trimmed'],
                    'spriteSourceSize': {
                        'x': frame_info['spriteSourceSize']['x'],
                        'y': frame_info['spriteSourceSize']['y'],
                        'w': frame_info['spriteSourceSize']['w'],
                        'h': frame_info['spriteSourceSize']['h']
                    },
                    'sourceSize': {
                        'w': frame_info['sourceSize']['w'],
                        'h': frame_info['sourceSize']['h']
                    },
                    'duration': int((frame_info['timestamp'] * 1000))
                }
            
            # 如果是第一张Sheet，保存为主文件
            if sheet_idx == 0:
                json_path = os.path.join(self.output_dir, 'spritesheet.json')
            else:
                # 其他Sheet保存为sheet_XXX.json
                json_path = os.path.join(self.output_dir, f'spritesheet_{sheet_idx:03d}.json')
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            print(f"  元数据 -> {json_path} ({len(sheet_data['frames'])} 帧)")
        
        print(f"  总Sheet数: {len(sheets_info)}")
        print(f"  总帧数: {frame_count}")
        print()
        
        # 返回主元数据
        return metadata

    def run(self):
        """执行完整流程"""
        try:
            # 1. 提取帧
            frame_list = self.extract_frames()
            
            if not frame_list:
                print("错误: 未能提取任何帧!")
                return False
            
            # 2. 创建Sprite Sheet
            sheets_info = self.create_sprite_sheets(frame_list)
            
            # 3. 生成元数据
            metadata = self.generate_metadata(sheets_info, len(frame_list))
            
            # 4. 生成总结
            print("[完成]")
            print(f"✓ 输出目录: {self.output_dir}")
            print(f"✓ Sprite Sheets: {len(sheets_info)} 张")
            print(f"✓ 总帧数: {len(frame_list)} 张")
            print(f"✓ 每帧原始大小: {self.frame_size}x{self.frame_size} 像素")
            print(f"✓ 输出格式: TexturePacker")
            print()
            
            return True
            
        except Exception as e:
            print(f"[错误] {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='视频转Sprite Sheet工具')
    parser.add_argument('video', help='输入视频文件路径')
    parser.add_argument('--output', '-o', default='output', help='输出目录 (默认: output)')
    parser.add_argument('--frame-size', '-fs', type=int, default=256, help='单帧大小 (默认: 256)')
    parser.add_argument('--atlas-size', '-as', type=int, default=1024, help='Sprite Sheet大小 (默认: 1024)')
    parser.add_argument('--fps-interval', '-fps', type=int, default=30, help='帧间隔，FPS数值 (默认: 30，1秒取1张)')
    
    args = parser.parse_args()
    
    converter = VideoToSpriteSheet(
        video_path=args.video,
        output_dir=args.output,
        frame_size=args.frame_size,
        atlas_size=args.atlas_size,
        fps_interval=args.fps_interval
    )
    
    success = converter.run()
    exit(0 if success else 1)


if __name__ == '__main__':
    main()
