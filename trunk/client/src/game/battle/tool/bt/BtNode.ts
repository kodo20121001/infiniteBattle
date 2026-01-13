
export class BtRet {

    static bt_ret_success = 1
	static bt_ret_failure = 2
	static bt_ret_running = 3
}

export class BtNode {

    bt
    data = {}
    object

    Start()
    {
    }

    Update()
    {
        return BtRet.bt_ret_success
    }
}