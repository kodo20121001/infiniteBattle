import { BtNodeSequence } from './BtNodeSequence'
import { BtNodeCallComMethod } from './BtNodeCallComMethod'
import { BtNodeWaitComMethod } from './BtNodeWaitComMethod'
import { BtNodeFirstResponse } from './BtNodeFirstResponse'
import { BtNodeFirstResponseSuccess } from './BtNodeFirstResponseSuccess'


class BtFactory
{
    btNodeNameToType = {}

    AddType(name, type)
    {
        this.btNodeNameToType[name] = type
    }

    Init()
    {
        this.AddType("BtNodeSequence", BtNodeSequence)
        this.AddType("BtNodeCallComMethod", BtNodeCallComMethod)
        this.AddType("BtNodeWaitComMethod", BtNodeWaitComMethod)
        this.AddType("BtNodeFirstResponse", BtNodeFirstResponse)
        this.AddType("BtNodeFirstResponseSuccess", BtNodeFirstResponseSuccess)
    }

    CreateNode(bt, name, data, children)
    {
        var type = this.btNodeNameToType[name]
        if(!type) console.warn("CreateNode==>name："+ name + "  type:" + type);
        var node = new type()
        node.bt = bt
        node.data = data
        
        if (children)
        {
            for (var i = 0; i < children.length; ++i)
            {
                let childConfig = children[i]
                let childNode = this.CreateNode(bt, childConfig.type, childConfig.data, childConfig.children)
                node.children.push(childNode)
            }
        }

        return node
    }
}

var BtFactoryInst = new BtFactory()
BtFactoryInst.Init()

export {BtFactoryInst}
