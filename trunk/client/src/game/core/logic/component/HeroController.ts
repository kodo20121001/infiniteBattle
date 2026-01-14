import { FixedVector2 } from "../../base/fixed/FixedVector2";
import { Hero } from "../actor/Hero";
import { Component } from "./Component";

export class HeroController extends Component
{
    PlayerClickMap(pos) {

        //this.owner.unitBehavior.WalkAStar(new FixedVector2(pos.x, pos.y))
        //this.owner.unitBehavior.WalkTo(new FixedVector2(pos.x, pos.y))
    }
}