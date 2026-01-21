import { Logger } from "../../engine/common";

export class Net
{
    url
    handler
    socket

    constructor(url, handler)
    {
        this.url = url
        this.handler = handler
    }

    Connect(sfunc, efunc)
    {
        Logger.log('connect')
        let self = this
        this.socket = new WebSocket(this.url)
        this.socket.onopen = function() {
            sfunc()
        }
        this.socket.onerror = function() {
            self.socket.close()
            self.socket = null
            efunc()
        }
        this.socket.onmessage = function(e) {

            //Logger.log('r:' + e.data)

            var data = JSON.parse(e.data)
            if (self.handler[data.type])
                self.handler[data.type](data)
            else
                Logger.log('unkown r:' + e.data)
        }
        this.socket.onclose = function() {
            if (self.socket)
            {
                self.socket.close()
                self.socket = null
                efunc()
            }
        }
    }

    Send(str)
    {
        this.socket.send(str)
        Logger.log('s:' + str)
    }

    Call(t)
    {
        var s = JSON.stringify(t)
        this.Send(s)
    }
}
