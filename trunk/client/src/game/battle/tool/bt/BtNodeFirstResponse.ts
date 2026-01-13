
import {BtNode, BtRet} from './BtNode'
import { BtNodeContainer } from './BtNodeContainer'

export class BtNodeFirstResponse extends BtNodeContainer
{
    Start()
    {
        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];
            child.Start()
        }
    }

    Update()
    {
        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];
            let ret = child.Update();

            if (ret === BtRet.bt_ret_success) {
                return BtRet.bt_ret_success;
            } else if (ret === BtRet.bt_ret_failure) {
                return BtRet.bt_ret_failure;
            } else if (ret === BtRet.bt_ret_running) {
                continue;
            }
        }
        return BtRet.bt_ret_running
    }
}
