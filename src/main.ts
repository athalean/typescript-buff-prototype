import { Character } from './characters';
import { Bleed, Power, Buff, Mutation, Representation, Attributes } from './buffs';

class TrainingDummy implements Buff {
    handleHeartBeat(source: Attributes, target: Attributes, beat: number, group: Buff[]): Mutation {
        return new Mutation(target, ((beat + 1) % 100 === 0) ? [{type: "Damage", amount: -500, attribute: "hp"}] : []);
    }
    mutate(source: Attributes, target: Attributes, group: Buff[]): Mutation {
        target.max_hp = 1000;
        return new Mutation(target, []);
    }
    getRepresentation(): Representation {
        return {
            name: "Training Dummy (regenerate health every 10 seconds)",
            count: -1,
            remaining_beats: -1,
        }
    }
}

var player = new Character();
var enemy = new Character();
enemy.receiveBuff(enemy, new TrainingDummy());
enemy.hp = 1000;

setInterval(function() {
    player.handleHeartbeat();
    enemy.handleHeartbeat();
},100);

function update() {
    let format_repr = (repr) => `<li>${repr.name}${repr.count > 0 ? ` (x${repr.count})` : ""}${(repr.remaining_beats > -1) ? `: ${repr.remaining_beats / 10}s remaining</li>` : ""}`;
    document.querySelector('#player-attr').innerHTML = JSON.stringify(player.getAttributes());
    document.querySelector('#player-buffs').innerHTML = player.buffGroups.map(
        (bg) => bg.getRepresentations().map(format_repr).join("")
    ).join("");
    document.querySelector('#enemy-attr').innerHTML = JSON.stringify(enemy.getAttributes());
    document.querySelector('#enemy-buffs').innerHTML = enemy.buffGroups.map(
        (bg) => bg.getRepresentations().map(format_repr).join("")
    ).join("");
}

document.querySelector("#hit").addEventListener('click', function() {
    enemy.takeHit(player, 10);
});
document.querySelector("#bleed").addEventListener('click', function() {
    // 5 ticks over 30 beats
    enemy.receiveBuff(player, new Bleed(50, 10))
});
document.querySelector("#power").addEventListener('click', function() {
    player.receiveBuff(player, new Power(50));
})

setInterval(update, 100);
update();

