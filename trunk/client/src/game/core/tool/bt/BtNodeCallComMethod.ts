
import {BtNode, BtRet} from './BtNode'

export class BtNodeCallComMethod extends BtNode
{
    currIndex

    Start()
    {
    }

    Update()
    {
        this.bt.object[this.data.com][this.data.call](...this.data.params)
        return BtRet.bt_ret_success
    }
}
