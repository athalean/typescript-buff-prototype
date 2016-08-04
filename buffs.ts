

interface Attributes {
    hp: number; 
    strength: number;
    dexterity: number;
}
interface Damage {
    type: "Damage";
    attribute: string; // enum or something in C#
    amount: number;
}
interface ApplyBuff {
    type: "ApplyBuff";
    buff: Buff;
}
interface RemoveSelf {
    type: "RemoveSelf";
}

type Action = Damage | ApplyBuff | RemoveSelf; // other ideas: "Resroration"

class Mutation {
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

interface Buff {
    // Called every stat calculation
    mutate?: (source: Attributes, target: Attributes, group: Buff[]) => Mutation;

    // Called every heartbeat (e.g. 60 times per second)
    handleHeartBeat: (source: Attributes, target: Attributes, beat: number, group: Buff[]) => Mutation;
}

class Bleed extends TimedBuff {
    static base_bleed_dmg = 30;

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
            let dmg: Damage = {type: "Damage", amount: this.calculate_dpt(target), attribute: "hp"};
            actions = actions.concat([dmg]);
        }

        return new Mutation(target, actions);
    }
}

class Power extends TimedBuff {
    static baseAmount: number = 1.2;
    amount: number;

    constructor(duration: number, amount: number = Power.baseAmount) {
        super(duration);
        this.amount = amount;
        this.duration = duration;
    }

    mutate(target: Attributes): Mutation {
        // this should be done immutably, but TypeScript sucks in that regard...
        target.strength *= this.amount;
        return new Mutation(target, []);
    }
}

interface Representation {
    icon: string;
    count: number;
    remaining_beats: number;
    total_beats: number;
}

class BuffState {
    public beats: number;
    public buff: Buff;
    constructor(buff: Buff) {
        this.buff = buff;
        this.beats = 0;
    }
    handleHeartBeat(source: Attributes, target: Attributes, group: Buff[]): Mutation {
        let mutation = this.buff.handleHeartBeat(source, target, this.beats, group);
        this.beats += 1;
        return mutation;
    }
    getExpiration(): number {
        if(this.buff instanceof TimedBuff) {
            return (this.buff as TimedBuff).duration
        }
        return -1;
    }
    unwrapBuff<T extends Buff>() {
        return (this.buff as any) as T;
    }
}

abstract class BuffGroup {
    // decide whether this group accepts a given buff.
    abstract acceptBuff(buff: Buff): boolean;
    // get the order
    abstract getOrder(): number;

    protected buffs: BuffState[];

    constructor(buffs: Buff[] = []) {
        this.buffs = [];
        for(let buff of buffs) {
            this.addBuff(buff);
        }
    }
    
    handleHeartBeat(source: Attributes, target: Attributes): Mutation {
        let actions: Action[] = [];
        let buffedTarget: Attributes = target;
        for(let buffState of this.buffs) {
            let result = buffState.handleHeartBeat(source, buffedTarget, this.buffs.map((b) => b.buff));
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

    getBuffs() {
        return [...this.buffs];
    }
    addBuff(buff: Buff): void {
        this.buffs.push(new BuffState(buff));
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
class MiscBuffGroup extends BuffGroup {
    getOrder() {
        return 999999999;
    }

    acceptBuff(b: Buff) {
        return true;
    }

    getRepresentations(): Representation[] {
        let representations: Representation[] = [];
        for(let buff of this.buffs) {
            if(((buff as any).getRepresentation || undefined) !== undefined ) {
                representations.push(((buff as any) as Representable).getRepresentation());
            }
        }
        return representations;
    }
}



class BleedGroup extends BuffGroup {
    // stolen for demonstration purposes
    static img: string = "https://wiki.guildwars2.com/images/4/4f/Bleeding_40px.png";

    acceptBuff(b: Buff): boolean {
        return (b instanceof Bleed);
    }

    getOrder() {
        return 10;
    }

    getRepresentations(): Representation[] {
        let total_beats = 10;
        let current_beats = this.buffs.reduce((agg, buff) => Math.max(agg, buff.duration), 0);
        return this.buffs.length > 0 ? [{
            icon: BleedGroup.img,
            count: this.buffs.length,
            remaining_beats: total_beats - current_beats,
            total_beats: total_beats,
        }] : [];
    }
}