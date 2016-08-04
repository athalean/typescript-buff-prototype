/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var characters_1 = __webpack_require__(1);
	var buffs_1 = __webpack_require__(2);
	var TrainingDummy = (function () {
	    function TrainingDummy() {
	    }
	    TrainingDummy.prototype.handleHeartBeat = function (source, target, beat, group) {
	        return new buffs_1.Mutation(target, ((beat + 1) % 100 === 0) ? [{ type: "Damage", amount: -500, attribute: "hp" }] : []);
	    };
	    TrainingDummy.prototype.mutate = function (source, target, group) {
	        target.max_hp = 1000;
	        return new buffs_1.Mutation(target, []);
	    };
	    TrainingDummy.prototype.getRepresentation = function () {
	        return {
	            name: "Training Dummy (regenerate health every 10 seconds)",
	            count: -1,
	            remaining_beats: -1,
	        };
	    };
	    return TrainingDummy;
	}());
	var player = new characters_1.Character();
	var enemy = new characters_1.Character();
	enemy.receiveBuff(enemy, new TrainingDummy());
	enemy.hp = 1000;
	setInterval(function () {
	    player.handleHeartbeat();
	    enemy.handleHeartbeat();
	}, 100);
	function update() {
	    var format_repr = function (repr) { return ("<li>" + repr.name + (repr.count > 0 ? " (x" + repr.count + ")" : "") + ((repr.remaining_beats > -1) ? ": " + repr.remaining_beats / 10 + "s remaining</li>" : "")); };
	    document.querySelector('#player-attr').innerHTML = JSON.stringify(player.getAttributes());
	    document.querySelector('#player-buffs').innerHTML = player.buffGroups.map(function (bg) { return bg.getRepresentations().map(format_repr).join(""); }).join("");
	    document.querySelector('#enemy-attr').innerHTML = JSON.stringify(enemy.getAttributes());
	    document.querySelector('#enemy-buffs').innerHTML = enemy.buffGroups.map(function (bg) { return bg.getRepresentations().map(format_repr).join(""); }).join("");
	}
	document.querySelector("#hit").addEventListener('click', function () {
	    enemy.takeHit(player, 10);
	});
	document.querySelector("#bleed").addEventListener('click', function () {
	    // 5 ticks over 30 beats
	    enemy.receiveBuff(player, new buffs_1.Bleed(50, 10));
	});
	document.querySelector("#power").addEventListener('click', function () {
	    player.receiveBuff(player, new buffs_1.Power(50));
	});
	setInterval(update, 100);
	update();


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var buffs_1 = __webpack_require__(2);
	var Character = (function () {
	    function Character() {
	        this.buffGroups = Character.BuffGroupClasses.map(function (cls) { return new cls(); });
	        this.hp = Character.baseAttributes.max_hp;
	        this.attributeCache = null;
	    }
	    Character.prototype.getBaseAttributes = function () {
	        // clone object
	        return JSON.parse(JSON.stringify(Character.baseAttributes));
	    };
	    Character.prototype.getAttributes = function () {
	        if ((this.attributeCache || null) !== null)
	            return this.attributeCache;
	        var result = this.getBaseAttributes();
	        for (var _i = 0, _a = this.buffGroups; _i < _a.length; _i++) {
	            var group = _a[_i];
	            result = group.mutate(result);
	        }
	        result.hp = this.hp;
	        return result;
	    };
	    Character.prototype.receiveBuff = function (source, buff) {
	        for (var _i = 0, _a = this.buffGroups; _i < _a.length; _i++) {
	            var group = _a[_i];
	            if (group.acceptBuff(buff)) {
	                group.addBuff(buff, source);
	                break;
	            }
	        }
	        this.invalidateCache();
	    };
	    Character.prototype.invalidateCache = function () {
	        this.attributeCache = null;
	    };
	    Character.prototype.handleHeartbeat = function () {
	        for (var _i = 0, _a = this.buffGroups; _i < _a.length; _i++) {
	            var group = _a[_i];
	            var result = group.handleHeartBeat(this.getAttributes());
	            for (var _b = 0, _c = result.actions; _b < _c.length; _b++) {
	                var action = _c[_b];
	                if (action.type === "Damage") {
	                    this.hp -= action.amount;
	                }
	            }
	        }
	        this.hp = Math.min(Math.max(0, this.hp), this.getAttributes().max_hp);
	        this.invalidateCache();
	    };
	    Character.prototype.takeHit = function (source, baseAmount) {
	        this.hp -= source.getAttributes().strength * baseAmount;
	    };
	    Character.baseAttributes = {
	        max_hp: 100,
	        strength: 10,
	        dexterity: 10
	    };
	    // or read from a config file, and implement a way to find a class from its name
	    Character.BuffGroupClasses = [
	        buffs_1.BleedGroup,
	        buffs_1.PowerGroup,
	        buffs_1.MiscBuffGroup
	    ];
	    return Character;
	}());
	exports.Character = Character;


/***/ },
/* 2 */
/***/ function(module, exports) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Mutation = (function () {
	    function Mutation(attributes, actions) {
	        this.attributes = attributes;
	        this.actions = actions;
	    }
	    return Mutation;
	}());
	exports.Mutation = Mutation;
	var TimedBuff = (function () {
	    function TimedBuff(duration) {
	        this.duration = duration;
	    }
	    TimedBuff.prototype.handleHeartBeat = function (source, target, beat, group) {
	        if (beat === this.duration)
	            return new Mutation(target, [{ type: "RemoveSelf" }]);
	        return new Mutation(target, []);
	    };
	    return TimedBuff;
	}());
	var Bleed = (function (_super) {
	    __extends(Bleed, _super);
	    function Bleed(duration, ticks, modifier) {
	        if (modifier === void 0) { modifier = 1; }
	        if (duration < ticks || ticks > duration / 2) {
	        }
	        _super.call(this, duration);
	        this.modifier = modifier;
	        // populate the tick_table with the heartbeats after application when a damage tick occurs 
	        this.tick_table = [];
	        if (ticks == 1) {
	            this.tick_table = [0];
	            return;
	        }
	        var rounding_up = false;
	        for (var i = 0; i <= duration + 0.1; i += duration / (ticks - 1)) {
	            rounding_up = !rounding_up;
	            this.tick_table.push(rounding_up ? Math.ceil(i) : Math.floor(i));
	        }
	    }
	    Bleed.prototype.calculate_dpt = function (target) {
	        return target.dexterity * Bleed.base_bleed_dmg * this.modifier;
	    };
	    Bleed.prototype.handleHeartBeat = function (source, target, beat, group) {
	        var actions = _super.prototype.handleHeartBeat.call(this, source, target, beat, group).actions;
	        // If the buff is determined to tick, apply health damage 
	        if (this.tick_table.indexOf(beat) !== -1) {
	            var dmg = { type: "Damage", amount: this.calculate_dpt(source), attribute: "hp" };
	            actions = actions.concat([dmg]);
	        }
	        return new Mutation(target, actions);
	    };
	    Bleed.base_bleed_dmg = .3;
	    return Bleed;
	}(TimedBuff));
	exports.Bleed = Bleed;
	var Power = (function (_super) {
	    __extends(Power, _super);
	    function Power(duration, amount) {
	        if (amount === void 0) { amount = Power.baseAmount; }
	        _super.call(this, duration);
	        this.amount = amount;
	        this.duration = duration;
	    }
	    Power.prototype.uniqueName = function () {
	        return "power";
	    };
	    Power.prototype.mutate = function (source, target, group) {
	        // only apply this buff ONCE (stacks duration)
	        if (group && group[0] === this) {
	            target.strength *= this.amount;
	            target.dexterity *= this.amount;
	        }
	        return new Mutation(target, []);
	    };
	    Power.baseAmount = 1.5;
	    return Power;
	}(TimedBuff));
	exports.Power = Power;
	var BuffState = (function () {
	    function BuffState(buff, source) {
	        this.buff = buff;
	        this.beats = 0;
	        this.source = source;
	    }
	    BuffState.prototype.handleHeartBeat = function (target, group) {
	        var mutation = this.buff.handleHeartBeat(this.source.getAttributes(), target, this.beats, group);
	        this.beats += 1;
	        return mutation;
	    };
	    BuffState.prototype.mutate = function (target, group) {
	        if (this.buff.mutate !== undefined)
	            return this.buff.mutate(this.source.getBaseAttributes(), target, group);
	        return new Mutation(target, []);
	    };
	    BuffState.prototype.getExpiration = function () {
	        if (this.buff instanceof TimedBuff) {
	            return this.buff.duration - this.beats;
	        }
	        return -1;
	    };
	    BuffState.prototype.unwrapBuff = function () {
	        return this.buff;
	    };
	    return BuffState;
	}());
	var BuffGroup = (function () {
	    function BuffGroup() {
	        this.buffs = [];
	    }
	    BuffGroup.prototype.handleHeartBeat = function (target) {
	        var actions = [];
	        var buffedTarget = target;
	        for (var _i = 0, _a = this.buffs; _i < _a.length; _i++) {
	            var buffState = _a[_i];
	            var result = buffState.handleHeartBeat(buffedTarget, this.buffs.map(function (b) { return b.buff; }));
	            for (var _b = 0, _c = result.actions; _b < _c.length; _b++) {
	                var action = _c[_b];
	                if (action.type === "RemoveSelf")
	                    this.removeBuff(buffState.buff);
	                else
	                    actions.push(action);
	            }
	            buffedTarget = result.attributes;
	        }
	        return new Mutation(buffedTarget, actions);
	    };
	    BuffGroup.prototype.mutate = function (target) {
	        var buffedTarget = target;
	        for (var _i = 0, _a = this.buffs; _i < _a.length; _i++) {
	            var buffState = _a[_i];
	            buffedTarget = buffState.mutate(buffedTarget, this.buffs.map(function (b) { return b.buff; })).attributes;
	        }
	        return buffedTarget;
	    };
	    BuffGroup.prototype.getBuffs = function () {
	        return this.buffs.slice();
	    };
	    BuffGroup.prototype.addBuff = function (buff, source) {
	        this.buffs.push(new BuffState(buff, source));
	    };
	    BuffGroup.prototype.removeBuff = function (buff) {
	        this.buffs = this.buffs.filter(function (buffState) { return buff !== buffState.buff; });
	    };
	    return BuffGroup;
	}());
	exports.BuffGroup = BuffGroup;
	// Misc Group - applied after everything else
	var MiscBuffGroup = (function (_super) {
	    __extends(MiscBuffGroup, _super);
	    function MiscBuffGroup() {
	        _super.apply(this, arguments);
	    }
	    MiscBuffGroup.prototype.getOrder = function () {
	        return 999999999;
	    };
	    MiscBuffGroup.prototype.acceptBuff = function (b) {
	        return true;
	    };
	    MiscBuffGroup.prototype.getRepresentations = function () {
	        var representations = [];
	        for (var _i = 0, _a = this.buffs; _i < _a.length; _i++) {
	            var buffState = _a[_i];
	            if ((buffState.buff.getRepresentation || undefined) !== undefined) {
	                representations.push(buffState.buff.getRepresentation());
	            }
	        }
	        return representations;
	    };
	    return MiscBuffGroup;
	}(BuffGroup));
	exports.MiscBuffGroup = MiscBuffGroup;
	var BleedGroup = (function (_super) {
	    __extends(BleedGroup, _super);
	    function BleedGroup() {
	        _super.apply(this, arguments);
	    }
	    BleedGroup.prototype.acceptBuff = function (b) {
	        return (b instanceof Bleed);
	    };
	    BleedGroup.prototype.getOrder = function () {
	        return 10;
	    };
	    BleedGroup.prototype.getRepresentations = function () {
	        return this.buffs.length > 0 ? [{
	                name: "bleed",
	                count: this.buffs.length,
	                remaining_beats: this.buffs.reduce(function (agg, buff) { return Math.max(agg, buff.getExpiration()); }, 0),
	            }] : [];
	    };
	    // stolen for demonstration purposes
	    BleedGroup.img = "https://wiki.guildwars2.com/images/4/4f/Bleeding_40px.png";
	    return BleedGroup;
	}(BuffGroup));
	exports.BleedGroup = BleedGroup;
	var PowerGroup = (function (_super) {
	    __extends(PowerGroup, _super);
	    function PowerGroup() {
	        _super.apply(this, arguments);
	    }
	    PowerGroup.prototype.acceptBuff = function (b) {
	        return (b instanceof Power);
	    };
	    PowerGroup.prototype.getOrder = function () {
	        return 10;
	    };
	    PowerGroup.prototype.getRepresentations = function () {
	        return this.buffs.length > 0 ? [{
	                name: "power",
	                count: -1,
	                remaining_beats: this.buffs.reduce(function (agg, buff) { return agg + buff.getExpiration(); }, 0),
	            }] : [];
	    };
	    return PowerGroup;
	}(BuffGroup));
	exports.PowerGroup = PowerGroup;


/***/ }
/******/ ]);
//# sourceMappingURL=index.js.map