export class AnimationPlayer2D {
    constructor(clips, mesh) {
        this.clips = clips;
        this.mesh = mesh;
        this.currentAction = null;
    }

    play(name) {
        const clip = this.clips[name];
        if (!clip) {
            console.warn(`Animation ${name} not found!`);
            return;
        }
        if (this.currentAction && name == this.currentAction.name)
            return

        this.currentAction = clip;
        this.currentFrame = 0;
    }

    update(deltaTime) {
        if (!this.currentAction) return;

        // 计算下一帧的索引
        const frameCount = this.currentAction.tracks[0].keyframes.length;
        const frameIndex = Math.floor(this.currentFrame % frameCount);

        this.mesh.material.map = this.currentAction.tracks[0].keyframes[frameIndex].value;
        this.mesh.material.needsUpdate = true;

        // 增加帧计数
        this.currentFrame += 10 * 0.01;
    }

    stop() {
        this.currentAction = null
    }
}