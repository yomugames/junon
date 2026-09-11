const Statuses = {}

Statuses.Oxygen  = require("./oxygen_status")
Statuses.Poison  = require("./poison_status")
Statuses.Hunger  = require("./hunger_status")
Statuses.Thirst  = require("./thirst_status")
Statuses.Stamina = require("./stamina_status")
Statuses.Fear    = require("./fear_status")
Statuses.Rage    = require("./rage_status")
Statuses.Paralyze = require("./paralyze_status")
Statuses.Drunk = require("./drunk_status")
Statuses.Miasma = require("./miasma_status")
Statuses.Drug = require("./drug_status")
Statuses.Addiction = require("./addiction_status")

module.exports = Statuses