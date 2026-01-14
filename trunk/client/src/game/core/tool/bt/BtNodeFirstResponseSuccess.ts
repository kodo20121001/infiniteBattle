
import {BtNode, BtRet} from './BtNode'
import { BtNodeContainer } from './BtNodeContainer'

export class BtNodeFirstResponseSuccess extends BtNodeContainer
{

    activeChildren

    Start()
    {
        this.activeChildren = [...this.children];
        for (let child of this.activeChildren) {
            child.Start();
        }
    }

    Update()
    {
        for (let i = 0; i < this.activeChildren.length; i++) {
            let child = this.activeChildren[i];
            let ret = child.Update();

            if (ret === BtRet.bt_ret_success) {
                return BtRet.bt_ret_success;
            } else if (ret === BtRet.bt_ret_failure) {
                this.activeChildren.splice(i, 1);
                i--; // Adjust index after removal
                if (this.activeChildren.length === 0) {
                    return BtRet.bt_ret_success;
                }
            } else if (ret === BtRet.bt_ret_running) {
                continue;
            }
        }
        return BtRet.bt_ret_running;
    }
}
