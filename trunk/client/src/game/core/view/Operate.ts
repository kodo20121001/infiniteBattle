import { Runtime } from "../Runtime";
import { CameraController } from "./CameraView";

export class Operate {
    start() {
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }

    onDisable () {
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }

    onMouseDown(event) {

        // var ray = new geometry.Ray();
        // CameraController.inst.camera.screenPointToRay(event.getLocationX(), event.getLocationY(), ray);
        // if (PhysicsSystem.instance.raycast(ray)) {

        //     const raycastResults = PhysicsSystem.instance.raycastResults;
        //     for (let i = 0; i < raycastResults.length; i++) {
        //         const item = raycastResults[i];

        //         Runtime.game.PlayerInput({
        //             type: 'PlayerClickMap',
        //             value1: item.hitPoint.x,
        //             value2: item.hitPoint.z,
        //         })
        //         break
        //     }
        // }
    }
}