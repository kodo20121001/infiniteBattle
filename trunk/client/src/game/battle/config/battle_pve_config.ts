
export const battle_pve_config  = {

    type: 'BtNodeFirstResponse', children: [
        {
            type: 'BtNodeSequence', children: [
                {type: 'BtNodeWaitComMethod', data: {com: 'battleModule', call: 'IsBattleOver', params: []}},
                {type: 'BtNodeWaitComMethod', data: {com: 'battleModule', call: 'BattleShow', params: []}},
            ]
        }
    ]
}