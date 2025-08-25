//todo: after save version v37 added, add v38 with RP level included.
class RP {
    constructor(sector) {
        this.sector = sector;
        this.level = 0;
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
                totalHappiness += this.sector.visitors[i].Happiness.value;
                this.sector.visitors[i].remove();
                delete this.sector.visitors[i];
            }

            this.addToCurrentRP(totalHappiness)
            this.sector.getSocketUtil().broadcast(this.sector.getSocketIds(), "ErrorMessage", { message: "All visitors have left." })

        }

        if (Math.floor(Math.random) * 2) {
            //  return;
        }

        let newMobs = this.sector.spawnMob({ player: this.sector, type: "visitor", count: 1 })
        this.sector.visitors = newMobs;
        
        this.sector.getSocketUtil().broadcast(this.sector.getSocketIds(), "ErrorMessage", { message: "A visitor has arrived!" })
    }

    addToCurrentRP(value) {
        this.level += value
        console.log("value added to rp level level now ", this.getRPLevel())
        this.sector.getSocketUtil().broadcast(this.sector.getSocketIds(), "RPUpdated", { RP: this.getRPLevel() });
    }

}

module.exports = RP;