import { Attributes, BleedGroup, PowerGroup, MiscBuffGroup, BuffGroup, Buff, Action } from './buffs';

export class Character {
    static baseAttributes = {
        max_hp: 100,
        strength: 10,
        dexterity: 10
    };

    buffGroups: BuffGroup[];
    private attributeCache: Attributes;
    hp: number;

    // or read from a config file, and implement a way to find a class from its name
    static BuffGroupClasses = [
        BleedGroup,
        PowerGroup,
        MiscBuffGroup
    ]

    constructor() {
        this.buffGroups = Character.BuffGroupClasses.map((cls) => new cls());
        this.hp = Character.baseAttributes.max_hp;
        this.attributeCache = null;
    }

    getBaseAttributes(): Attributes {
        // clone object
        return JSON.parse(JSON.stringify(Character.baseAttributes));
    }

    getAttributes(): Attributes {
        if((this.attributeCache || null) !== null)
            return this.attributeCache;
        
        let result = this.getBaseAttributes();
        for(let group of this.buffGroups) 
           result = group.mutate(result);
        result.hp = this.hp;
        return result;
    }

    receiveBuff(source: Character, buff: Buff): void {
        for(let group of this.buffGroups) {
            if(group.acceptBuff(buff)) {
                group.addBuff(buff, source);
                break;
            }
                
        }
        this.invalidateCache();
    }

    invalidateCache() {
        this.attributeCache = null;
    }

    handleHeartbeat() {
        for(let group of this.buffGroups) {
            let result = group.handleHeartBeat(this.getAttributes());
            for(let action of result.actions) {
                if(action.type === "Damage") {
                    this.hp -= action.amount;
                }
            }
        }
        this.hp = Math.min(Math.max(0, this.hp), this.getAttributes().max_hp);
        this.invalidateCache();
    }

    takeHit(source: Character, baseAmount: number): void {
        this.hp -= source.getAttributes().strength * baseAmount;
    }
}