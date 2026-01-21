
import {BtNode, BtRet} from './BtNode'
import { BtFactoryInst } from './BtFactory'

export class BehaviorTree {

    object
    rootNode
    isOver

    Start(object)
    {
        this.object = object
        this.isOver = false
        this.rootNode.Start()
    }

    Stop()
    {
        this.isOver = true
    }

    IsOver()
    {
        return this.isOver
    }

    Update()
    {
        if (this.isOver)
            return
        var ret = this.rootNode.Update()
        if (ret == BtRet.bt_ret_failure || ret == BtRet.bt_ret_success)
            this.isOver = true
    }

    static Create(config: any)
    {
        var bt = new BehaviorTree()
        bt.rootNode = BtFactoryInst.CreateNode(bt, config.type, config.data, config.children)

        return bt
    }
}