"""
使用示例 - 演示如何使用VideoToSpriteSheet类
"""

from main import VideoToSpriteSheet
import json


def example_1_basic():
    """示例1: 基本用法"""
    print("=" * 60)
    print("示例1: 基本用法")
    print("=" * 60)
    
    converter = VideoToSpriteSheet(
        video_path='input/example.mp4',
        output_dir='output/example1'
    )
    converter.run()


def example_2_custom_params():
    """示例2: 自定义参数"""
    print("\n" + "=" * 60)
    print("示例2: 自定义参数（高分辨率）")
    print("=" * 60)
    
    converter = VideoToSpriteSheet(
        video_path='input/example.mp4',
        output_dir='output/example2',
        frame_size=512,      # 512x512的帧
        atlas_size=2048,     # 2048x2048的Sprite Sheet
        fps_interval=15      # 高帧率，更流畅
    )
    converter.run()


def example_3_low_fps():
    """示例3: 低帧率（节省空间）"""
    print("\n" + "=" * 60)
    print("示例3: 低帧率（节省空间）")
    print("=" * 60)
    
    converter = VideoToSpriteSheet(
        video_path='input/example.mp4',
        output_dir='output/example3',
        frame_size=128,      # 小帧
        atlas_size=1024,     
        fps_interval=60      # 低帧率
    )
    converter.run()


def example_4_read_metadata():
    """示例4: 读取和使用元数据"""
    print("\n" + "=" * 60)
    print("示例4: 读取元数据")
    print("=" * 60)
    
    # 读取元数据
    with open('output/example1/spritesheet.json', 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    
    print(f"\n视频来源: {metadata['source_video']}")
    print(f"总帧数: {metadata['statistics']['total_frames']}")
    print(f"总Sheet数: {metadata['statistics']['total_sheets']}")
    print(f"单帧大小: {metadata['config']['frame_size']}x{metadata['config']['frame_size']}")
    
    # 获取第一帧的信息
    first_frame = metadata['sheets'][0]['frames'][0]
    print(f"\n第一帧信息:")
    print(f"  位置: ({first_frame['x']}, {first_frame['y']})")
    print(f"  时间戳: {first_frame['timestamp']:.2f}s")
    print(f"  所在Sheet: spritesheet_{metadata['sheets'][0]['file'].split('_')[1]}")


def example_5_game_usage():
    """示例5: 游戏引擎使用示例"""
    print("\n" + "=" * 60)
    print("示例5: 游戏引擎伪代码")
    print("=" * 60)
    
    code = '''
    // 伪代码 - 游戏引擎中的使用方式
    
    class SpriteSheetAnimator {
        constructor(metadata_file) {
            this.metadata = loadJSON(metadata_file);
            this.current_frame = 0;
            this.elapsed_time = 0;
        }
        
        update(delta_time) {
            this.elapsed_time += delta_time;
            
            // 计算应该显示哪一帧
            // 根据动画速度调整
            let frame_index = Math.floor(this.elapsed_time * animation_speed);
            
            if (frame_index >= this.metadata.statistics.total_frames) {
                frame_index = 0;  // 循环
                this.elapsed_time = 0;
            }
            
            this.current_frame = frame_index;
        }
        
        render(ctx, x, y) {
            // 找到当前帧的信息
            let frame_info = null;
            for (let sheet of this.metadata.sheets) {
                for (let frame of sheet.frames) {
                    if (frame.original_index === this.current_frame) {
                        frame_info = frame;
                        break;
                    }
                }
            }
            
            if (!frame_info) return;
            
            // 从Sheet中截取相应的区域绘制
            ctx.drawImage(
                spritesheet_image,
                frame_info.x,              // 源X
                frame_info.y,              // 源Y
                this.metadata.config.frame_size,  // 宽
                this.metadata.config.frame_size,  // 高
                x, y,                      // 目标位置
                display_width,             // 显示宽
                display_height             // 显示高
            );
        }
    }
    '''
    
    print(code)


if __name__ == '__main__':
    # 运行示例
    # 注意: 需要在 input/ 目录下放置 example.mp4
    
    print("\n提示: 请先在 input/ 目录下放置视频文件: example.mp4\n")
    
    try:
        example_1_basic()
        # example_2_custom_params()
        # example_3_low_fps()
        # example_4_read_metadata()
        example_5_game_usage()
    except FileNotFoundError as e:
        print(f"\n错误: {e}")
        print("请确保在 input/ 目录下有视频文件")
