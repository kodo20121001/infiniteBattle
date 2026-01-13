
import {BtNode, BtRet} from './BtNode'
import { BtNodeContainer } from './BtNodeContainer'

export class BtNodeSequence extends BtNodeContainer
{
    currNode
    currIndex

    Start()
    {
        this.currNode = null
        this.currIndex = -1
    }

    Update()
    {
        while (this.children.length > 0)
        {
            if (this.currNode)
            {
                let ret = this.currNode.Update()
                if (ret == BtRet.bt_ret_running)
                    return BtRet.bt_ret_running
            }
            ++this.currIndex

            if (this.currIndex >= this.children.length)
                return this.data?.ret ? this.data.ret : BtRet.bt_ret_success 
            else
                this.currNode = this.children[this.currIndex]
    
            this.currNode.Start()
        }
    
        return BtRet.bt_ret_success
    }
}
