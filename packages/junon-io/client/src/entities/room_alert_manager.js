class RoomAlertManager {
  constructor(container) {
    this.container = container
    this.rooms = {}
  }

  addRoom(room) {
    this.rooms[room.id] = room
    room.sprite.alpha = 1
    this.onRoomChanged()
  }

  removeRoom(room) {
    delete this.rooms[room.id] 
    room.sprite.alpha = 0
    this.onRoomChanged()
  }

  hasAlarm() {
    return Object.keys(this.rooms).length > 0  
  }

  onRoomChanged() {
    if (this.hasAlarm()) {
      this.alarmTween = this.getAlarmAnimationTween()
      this.alarmTween.start()
    } else {
      this.clear()
    }
  }

  clear() {
    if (this.alarmTween) {
      this.alarmTween.stop()
      this.alarmTween = null
    }
  }

  getSprite() {
    return this.container.spriteLayers["rooms"] 
  }

  getAlarmAnimationTween() {
    let opacity = { opacity: 1 }

    var tween = new TWEEN.Tween(opacity)
        .to({ opacity: 0.5 }, 1000)
        .onUpdate(() => {
          this.getSprite().alpha = opacity.opacity
        })
        .onStop(() => {
          this.getSprite().alpha = 0
        })
        .yoyo(true)
        .repeat(Infinity)

    return tween
  }

}

module.exports = RoomAlertManager