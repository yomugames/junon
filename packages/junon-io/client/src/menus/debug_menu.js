const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")

class DebugMenu extends BaseMenu {

  open(data) {
    super.open()

    let json = JSON.parse(data.data)
    if (data.type === "room") {
      this.drawRoomGraph(json)
    }
  }

  isModal() {
    return false
  }


  drawRoomGraph(json) {
    let nodes = json.nodes
    let edges = json.edges

    var cy = window.cy = cytoscape({
      container: document.getElementById('debug_network_graph'),

      boxSelectionEnabled: false,
      autounselectify: true,

      style: [
        {
          selector: 'node',
          css: {
            'content': 'data(id)',
            'text-valign': 'center',
            'text-halign': 'center'
          }
        },
        {
          selector: '$node > node',
          css: {
            'padding-top': '5px',
            'padding-left': '5px',
            'padding-bottom': '5px',
            'padding-right': '5px',
            'text-valign': 'top',
            'text-halign': 'center',
            'background-color': '#bbb'
          }
        },
        {
          selector: 'edge',
          css: {
            'target-arrow-shape': 'triangle'
          }
        },
        {
          selector: ':selected',
          css: {
            'background-color': 'black',
            'line-color': 'black',
            'target-arrow-color': 'black',
            'source-arrow-color': 'black'
          }
        }
      ],

      elements: {
        nodes: nodes,
        edges: edges
      },

      layout: {
        name: 'breadthfirst'
      }
    })

  }



  cleanup() {

  }

}



module.exports = DebugMenu 