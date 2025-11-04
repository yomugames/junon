//todo: after save version v37 added, add v38 with RP level included.
class RP {
    constructor(sector, RPLevel) {
        this.sector = sector;
        this.level = RPLevel || 0;
    }
    getRPLevel() {
        return this.level;
    }
    onDayCountChanged() {
        if(this.sector.isPeaceful()) return;

        let daycount = this.sector.getDayCount()
        if (daycount < 2/*10*/) return;

        if (this.sector.visitors) {
            let totalHappiness = 0;
            for (let i in this.sector.visitors) {
                totalHappiness += this.sector.visitors[i].Happiness.level;
                this.sector.visitors[i].remove();
                delete this.sector.visitors[i];
            }
            this.sector.visitorHappiness = 0;
            this.addToCurrentRP(totalHappiness)
            this.sector.getSocketUtil().broadcast(this.sector.getSocketIds(), "ErrorMessage", { message: "All visitors have left." })

        }

        if (Math.floor(Math.random) * 2) {
            //  return;
        }

        if(!this.sector.getFirstPlayer()) return //this is for the rare event that visitor spawns before player is initialized (ie. the timestamp is 5999)

        this.sector.spawnMob({ player: this.sector, type: "visitor", count: 1 });
        //this.sector.visitors = newMobs;
        //Visitor() will handle this
        
        this.sector.getSocketUtil().broadcast(this.sector.getSocketIds(), "ErrorMessage", { message: "A visitor has arrived!" })
    }

    addToCurrentRP(value) {
        if(!value) return;
        this.level += value
        this.sector.getSocketUtil().broadcast(this.sector.getSocketIds(), "RPUpdated", { RP: this.getRPLevel() || 0, visitorHappiness: this.sector.visitorHappiness || 0 });
    }

}

module.exports = RP;