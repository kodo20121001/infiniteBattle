
import {BtNode, BtRet} from './BtNode'

export class BtNodeWaitComMethod extends BtNode
{
    data
    currIndex

    Start()
    {
    }

    Update()
    {
        if (!this.bt.object[this.data.com][this.data.call](...this.data.params))
            return BtRet.bt_ret_running
        return BtRet.bt_ret_success
    }
}
