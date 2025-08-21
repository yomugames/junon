//todo: after save version v37 added, add v38 with RP level included.
class RP {
    constructor(sector) {
        this.sector = sector;
        this.level;
    }
    getRPLevel() {
        return this.level;
    }
    onDayCountChanged() {
        if(this.sector.isPeaceful()) return;

        let daycount = this.sector.getDayCount()
        if(daycount < 10) return;
        if(Math.floor(Math.random)*2) {
            return;
        }
        

    }
    
}

module.exports = RP;