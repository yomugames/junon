const Prometheus = require('prom-client')

class MetricsExporter {

  constructor() {

  }

  static init() {
    const collectDefaultMetrics = Prometheus.collectDefaultMetrics
    collectDefaultMetrics({ timeout: 5000 })

    this.userCount = new Prometheus.Gauge({ name: 'users', help: 'number of users playing' })
  }

  static sendUserCount(count) {
    this.userCount.set(count)
  }
}

module.exports = MetricsExporter