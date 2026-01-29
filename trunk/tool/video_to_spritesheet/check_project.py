#!/usr/bin/env python3
"""
项目完整性检查工具
验证所有必要的文件和配置是否完整
"""

import os
import json
from pathlib import Path


class ProjectValidator:
    def __init__(self, project_root='.'):
        self.root = Path(project_root)
        self.errors = []
        self.warnings = []
        self.success = []
        
    def check_files(self):
        """检查必要文件"""
        print("=" * 70)
        print("【文件检查】")
        print("=" * 70)
        
        required_files = {
            'main.py': '核心模块',
            'quickstart.py': '快速启动脚本',
            'requirements.txt': '依赖列表',
            'config.json': '预设配置',
            'README.md': '完整说明',
            'GETTING_STARTED.md': '快速开始',
            'INTEGRATION_GUIDE.md': '集成指南',
            'PROJECT.md': '项目文档',
            'example_usage.py': '使用示例',
        }
        
        for filename, description in required_files.items():
            file_path = self.root / filename
            if file_path.exists():
                size = file_path.stat().st_size
                print(f"  ✓ {filename:<25} ({size:>6} bytes) - {description}")
                self.success.append(filename)
            else:
                msg = f"✗ {filename:<25} 缺失 - {description}"
                print(f"  {msg}")
                self.errors.append(msg)
    
    def check_directories(self):
        """检查必要目录"""
        print("\n" + "=" * 70)
        print("【目录检查】")
        print("=" * 70)
        
        required_dirs = {
            'input': '输入文件夹（用于放置视频）',
            'output': '输出文件夹（用于保存结果）',
        }
        
        for dirname, description in required_dirs.items():
            dir_path = self.root / dirname
            if dir_path.exists():
                print(f"  ✓ {dirname}/ {' ' * 20} - {description}")
                self.success.append(dirname)
            else:
                msg = f"✗ {dirname}/ {' ' * 20} 缺失 - {description}"
                print(f"  {msg}")
                self.errors.append(msg)
    
    def check_config(self):
        """检查配置文件内容"""
        print("\n" + "=" * 70)
        print("【配置检查】")
        print("=" * 70)
        
        config_file = self.root / 'config.json'
        if not config_file.exists():
            print("  ⚠ config.json 未找到")
            return
        
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            print(f"  ✓ config.json 配置有效")
            print(f"    - 预设数量: {len(config.get('presets', {}))} 个")
            print(f"    - 默认预设: {config.get('default_preset', 'N/A')}")
            
            presets = config.get('presets', {})
            print(f"    - 可用预设:")
            for preset_name in presets.keys():
                print(f"      • {preset_name}")
            
            self.success.append('config.json')
            
        except Exception as e:
            msg = f"✗ config.json 解析失败: {e}"
            print(f"  {msg}")
            self.errors.append(msg)
    
    def check_dependencies(self):
        """检查依赖文件"""
        print("\n" + "=" * 70)
        print("【依赖检查】")
        print("=" * 70)
        
        req_file = self.root / 'requirements.txt'
        if not req_file.exists():
            print("  ⚠ requirements.txt 未找到")
            return
        
        try:
            with open(req_file, 'r', encoding='utf-8') as f:
                packages = [line.strip() for line in f if line.strip() and not line.startswith('#')]
            
            print(f"  ✓ requirements.txt 有效")
            print(f"    - 依赖包数: {len(packages)} 个")
            for pkg in packages:
                print(f"      • {pkg}")
            
            self.success.append('requirements.txt')
            
        except Exception as e:
            msg = f"✗ requirements.txt 解析失败: {e}"
            print(f"  {msg}")
            self.errors.append(msg)
    
    def check_python_code(self):
        """检查主要Python代码"""
        print("\n" + "=" * 70)
        print("【代码检查】")
        print("=" * 70)
        
        main_file = self.root / 'main.py'
        if not main_file.exists():
            print("  ⚠ main.py 未找到")
            return
        
        try:
            with open(main_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 检查关键类和方法
            checks = {
                'class VideoToSpriteSheet': '主类定义',
                'def extract_frames': '帧提取方法',
                'def create_sprite_sheets': 'Sheet创建方法',
                'def generate_metadata': '元数据生成方法',
                'def run': '主执行方法',
            }
            
            print(f"  ✓ main.py 代码结构完整")
            for check, description in checks.items():
                if check in content:
                    print(f"    ✓ {description} (已定义)")
                else:
                    print(f"    ⚠ {description} (未找到)")
                    self.warnings.append(f"main.py 中缺少 {description}")
            
            self.success.append('main.py')
            
        except Exception as e:
            msg = f"✗ main.py 检查失败: {e}"
            print(f"  {msg}")
            self.errors.append(msg)
    
    def check_documentation(self):
        """检查文档完整性"""
        print("\n" + "=" * 70)
        print("【文档检查】")
        print("=" * 70)
        
        docs = {
            'README.md': '完整功能说明',
            'GETTING_STARTED.md': '快速开始指南',
            'INTEGRATION_GUIDE.md': '游戏引擎集成',
            'PROJECT.md': '项目总体说明',
        }
        
        for filename, description in docs.items():
            file_path = self.root / filename
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = len(f.readlines())
                print(f"  ✓ {filename:<25} ({lines:>4} 行) - {description}")
                self.success.append(filename)
            else:
                msg = f"✗ {filename:<25} 缺失 - {description}"
                print(f"  {msg}")
                self.warnings.append(msg)
    
    def generate_report(self):
        """生成检查报告"""
        print("\n" + "=" * 70)
        print("【检查报告】")
        print("=" * 70)
        
        total = len(self.success) + len(self.errors) + len(self.warnings)
        
        print(f"\n✓ 成功: {len(self.success)} 项")
        print(f"⚠ 警告: {len(self.warnings)} 项")
        print(f"✗ 错误: {len(self.errors)} 项")
        
        if self.warnings:
            print(f"\n警告详情:")
            for warning in self.warnings:
                print(f"  ⚠ {warning}")
        
        if self.errors:
            print(f"\n错误详情:")
            for error in self.errors:
                print(f"  ✗ {error}")
        
        # 最终判断
        print("\n" + "=" * 70)
        if self.errors:
            print("❌ 项目检查失败：存在关键错误")
            return False
        elif self.warnings:
            print("⚠️  项目基本完整：存在一些警告")
            return True
        else:
            print("✅ 项目检查通过：所有检查项完整")
            return True
    
    def run_all_checks(self):
        """运行所有检查"""
        self.check_files()
        self.check_directories()
        self.check_config()
        self.check_dependencies()
        self.check_python_code()
        self.check_documentation()
        return self.generate_report()


def print_usage_tips():
    """打印使用提示"""
    print("\n" + "=" * 70)
    print("【快速开始】")
    print("=" * 70)
    print("""
1. 安装依赖:
   pip install -r requirements.txt

2. 准备视频:
   将视频文件放入 input/ 文件夹

3. 运行转换:
   python main.py input/your_video.mp4
   
   或使用预设:
   python quickstart.py input/your_video.mp4 -p 标准动画

4. 查看结果:
   输出在 output/ 文件夹中

更多信息请参考:
  - GETTING_STARTED.md (快速开始)
  - README.md (完整说明)
  - INTEGRATION_GUIDE.md (游戏集成)
""")


if __name__ == '__main__':
    import sys
    
    print("\n╔════════════════════════════════════════════════════════════════════╗")
    print("║          视频转Sprite Sheet 工具 - 项目完整性检查                  ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    
    validator = ProjectValidator()
    success = validator.run_all_checks()
    print_usage_tips()
    
    sys.exit(0 if success else 1)
