
import { Character } from './characters';

export interface Attributes {
    hp: number; 
    strength: number;
    dexterity: number;
    max_hp: number;
}
export interface Damage {
    type: "Damage";
    attribute: string; // enum or something in C#
    amount: number;
}
export interface ApplyBuff {
    type: "ApplyBuff";
    buff: Buff;
}
export interface RemoveSelf {
    type: "RemoveSelf";
}
export interface SkipBeat {
    type: "SkipBeat";
}

export type Action = Damage | ApplyBuff | RemoveSelf | SkipBeat; // other ideas: "Resroration"

export class Mutation {
    attributes: Attributes;
    actions: Action[]
    constructor(attributes: Attributes, actions: Action[]) {
        this.attributes = attributes;
        this.actions = actions;
    }
}

abstract class TimedBuff implements Buff {
    public duration: number;
    constructor(duration: number) {
        this.duration = duration;
    }
    handleHeartBeat(source: Attributes, target: Attributes, beat: number, group: Buff[]): Mutation {
        if (beat === this.duration)
            return new Mutation(target, [{type: "RemoveSelf"}]);
        return new Mutation(target, []);
    }
}

export interface Buff {
    // Called every stat calculation
    mutate?: (source: Attributes, target: Attributes, group: Buff[]) => Mutation;

    // Called every heartbeat (e.g. 60 times per second)
    handleHeartBeat: (source: Attributes, target: Attributes, beat: number, group: Buff[]) => Mutation;

    uniqueName?: () => string;
}

export class Bleed extends TimedBuff {
    static base_bleed_dmg = .3;

    tick_table: number[];
    modifier: number;
    
    constructor(duration: number, ticks: number, modifier: number = 1) {
        if(duration < ticks || ticks > duration / 2) {
            // error handling
        }
        super(duration);

        this.modifier = modifier;

        // populate the tick_table with the heartbeats after application when a damage tick occurs 
        this.tick_table = [];
        if (ticks == 1) {
            this.tick_table = [0];
            return;
        }

        let rounding_up: boolean = false;
        for(let i = 0; i <= duration+0.1; i += duration / (ticks - 1)) {
            rounding_up = !rounding_up;
            this.tick_table.push(rounding_up ? Math.ceil(i): Math.floor(i) );
        }
    }

    calculate_dpt(target: Attributes): number {
        return target.dexterity * Bleed.base_bleed_dmg * this.modifier;
    }

    handleHeartBeat(source: Attributes, target: Attributes, beat: number, group: Buff[]): Mutation {
        let actions: Action[] = super.handleHeartBeat(source, target, beat, group).actions;
        
        // If the buff is determined to tick, apply health damage 
        if (this.tick_table.indexOf(beat) !== -1) {
            let dmg: Damage = {type: "Damage", amount: this.calculate_dpt(source), attribute: "hp"};
            actions = actions.concat([dmg]);
        }

        return new Mutation(target, actions);
    }
}

export class Power extends TimedBuff {
    static baseAmount: number = 1.5;
    amount: number;

    constructor(duration: number, amount: number = Power.baseAmount) {
        super(duration);
        this.amount = amount;
        this.duration = duration;
    }

    uniqueName(): string {
        return "power"
    }

    mutate(source: Attributes, target: Attributes, group: Buff[]): Mutation {
        // only apply this buff ONCE (stacks duration)
        if(group && group[0] === this) {
            target.strength *= this.amount;
            target.dexterity *= this.amount;
        }
        return new Mutation(target, []);
    }

    handleHeartBeat(source: Attributes, target: Attributes, beat: number, group: Buff[]): Mutation {
        if(group && group[0] !== this)
            return new Mutation(target, [{type: "SkipBeat"}]);
        return new Mutation(target, []);
    }
}

export interface Representation {
    name: string;
    count: number;
    remaining_beats: number;
}

class BuffState {
    beats: number;
    buff: Buff;
    source: Character;

    constructor(buff: Buff, source: Character) {
        this.buff = buff;
        this.beats = 0;
        this.source = source;
    }
    handleHeartBeat(target: Attributes, group: Buff[]): Mutation {
        let mutation = this.buff.handleHeartBeat(this.source.getAttributes(), target, this.beats, group);
        let actions: Action[] = [];
        let skipping = false;

        for(let action of mutation.actions) {
            actions.push(action);
            skipping = skipping || action.type === "SkipBeat";
        }
            
        this.beats += (skipping) ? 0 : 1;
        return new Mutation(mutation.attributes, actions);
    }
    mutate(target: Attributes, group: Buff[]): Mutation {
        if(this.buff.mutate !== undefined)
            return (this.buff as any).mutate(this.source.getBaseAttributes(), target, group);
        return new Mutation(target, []);
    }
    getExpiration(): number {
        
        if(this.buff instanceof TimedBuff) {
            return (this.buff as TimedBuff).duration - this.beats;
        }
        return -1;
    }
    unwrapBuff<T extends Buff>() {
        return (this.buff as any) as T;
    }
}

export abstract class BuffGroup {
    // decide whether this group accepts a given buff.
    abstract acceptBuff(buff: Buff): boolean;
    // get the order
    abstract getOrder(): number;

    protected buffs: BuffState[];

    constructor() {
        this.buffs = [];
    }
    
    handleHeartBeat(target: Attributes): Mutation {
        let actions: Action[] = [];
        let buffedTarget: Attributes = target;
        for(let buffState of this.buffs) {
            let result = buffState.handleHeartBeat(buffedTarget, this.buffs.map((b) => b.buff));
            for(let action of result.actions) {
                if(action.type === "RemoveSelf")
                    this.removeBuff(buffState.buff);
                else
                    actions.push(action);
            }
            buffedTarget = result.attributes;
        }
        return new Mutation(buffedTarget, actions);
    }

    mutate(target: Attributes): Attributes {
        let buffedTarget: Attributes = target;
        for(let buffState of this.buffs)
            buffedTarget = buffState.mutate(buffedTarget, this.buffs.map((b) => b.buff)).attributes;
        return buffedTarget;
    }

    getBuffs() {
        return [...this.buffs];
    }
    addBuff(buff: Buff, source: Character): void {
        this.buffs.push(new BuffState(buff, source));
    }
    removeBuff(buff: Buff): void {
        this.buffs = this.buffs.filter((buffState) => buff !== buffState.buff);
    }
    abstract getRepresentations(): Representation[];
}

interface Representable {
    getRepresentation(): Representation;
}

// Misc Group - applied after everything else
export class MiscBuffGroup extends BuffGroup {
    getOrder() {
        return 999999999;
    }

    acceptBuff(b: Buff) {
        return true;
    }

    getRepresentations(): Representation[] {
        let representations: Representation[] = [];
        for(let buffState of this.buffs) {
            if(((buffState.buff as any).getRepresentation || undefined) !== undefined ) {
                representations.push(((buffState.buff as any) as Representable).getRepresentation());
            }
        }
        return representations;
    }
}


export class BleedGroup extends BuffGroup {
    // stolen for demonstration purposes
    static img: string = "https://wiki.guildwars2.com/images/4/4f/Bleeding_40px.png";

    acceptBuff(b: Buff): boolean {
        return (b instanceof Bleed);
    }

    getOrder() {
        return 10;
    }

    getRepresentations(): Representation[] {
        return this.buffs.length > 0 ? [{
            name: "bleed",
            count: this.buffs.length,
            remaining_beats: this.buffs.reduce((agg, buff) => Math.max(agg, buff.getExpiration()), 0),
        }] : [];
    }
}

export class PowerGroup extends BuffGroup {
    acceptBuff(b: Buff): boolean {
        return (b instanceof Power);
    }

    getOrder() {
        return 10;
    }
    getRepresentations(): Representation[] {
        return this.buffs.length > 0 ? [{
            name: "power",
            count: -1,
            remaining_beats: this.buffs.reduce((agg, buff) => agg + buff.getExpiration(), 0),
        }] : [];
    }
}