import { Actor } from "../logic/actor/Actor";

export class Audio  {

    actor: Actor;
    transfrom : Node;
    config;

    actions;

    constructor(data) {
        this.transfrom = new Node();
        this.transfrom.name = 'Audio';

        //this.config = data.config;
    }



    static Play(res: string, cfg: number)
    {
    }

    

    
}