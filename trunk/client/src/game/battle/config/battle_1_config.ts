import { ActorType } from "../BattleLogic/Def";
import { BtRet } from "../BattleLogic/tool/bt/BtNode";

export const battle_1_config = {

    type: 'BtNodeFirstResponseSuccess', children: [
        {
            type: 'BtNodeSequence', children: [
                {type: 'BtNodeWaitComMethod', data: {com: 'battleModule', call: 'IsPart1Over', params: []}},
                {type: 'BtNodeCallComMethod', data: {com: 'battleModule', call: 'GoEnemyHome', params: []}},
                {type: 'BtNodeWaitComMethod', data: {com: 'battleModule', call: 'IsMoveOver', params: []}},
            ], data: {ret: BtRet.bt_ret_failure}
        },
        {
            type: 'BtNodeSequence', children: [
                {type: 'BtNodeWaitComMethod', data: {com: 'battleModule', call: 'IsBattleOver', params: []}},
                {type: 'BtNodeWaitComMethod', data: {com: 'battleModule', call: 'BattleShow', params: []}},
            ]
        }
    ]
}