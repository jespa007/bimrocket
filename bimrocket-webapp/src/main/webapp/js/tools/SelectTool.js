/*
 * SelectTool.js
 *
 * @autor: realor
 */

BIMROCKET.SelectTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "select";
    this.label = "tool.select.label";
    this.help = "tool.select.help";
    this.className = "select";
    this.setOptions(options);

    this._onMouseUp = this.onMouseUp.bind(this);
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(
      "panel_" + this.name, this.label, "left");
    this.panel.preferredHeight = 120;
    
    var helpElem = document.createElement("div");
    helpElem.innerHTML = I18N.get(this.help);
    this.panel.bodyElem.appendChild(helpElem);

    this.posElem = document.createElement("div");
    this.posElem.style.textAlign = "center";
    this.posElem.style.padding = "4px";
    this.panel.bodyElem.appendChild(this.posElem);

    this.controllersElem = document.createElement("div");
    this.controllersElem.className = "controllers";
    this.panel.bodyElem.appendChild(this.controllersElem);
  }

  activate()
  {
    this.panel.visible = true;
    var container = this.application.container;
    container.addEventListener('mouseup', this._onMouseUp, false);
  }

  deactivate()
  {
    this.panel.visible = false;
    var container = this.application.container;
    container.removeEventListener('mouseup', this._onMouseUp, false);
  }

  onMouseUp(event)
  {
    if (!this.isCanvasEvent(event)) return;

    const application = this.application;
    const scene = application.scene;
    const selection = application.selection;

    var mousePosition = this.getMousePosition(event);
    var intersect = this.intersect(mousePosition, scene, true);
    if (intersect)
    {
      var point = intersect.point;
      var xpos = Math.round(point.x * 1000) / 1000;
      var ypos = Math.round(point.y * 1000) / 1000;
      var zpos = Math.round(point.z * 1000) / 1000;
      this.posElem.innerHTML = "(x, y ,z) = (" +
        xpos + ", " + ypos + ", " + zpos + ")";

      var object = intersect.object;

      var parent = object;
      while (parent && !parent.userData.selection)
      {
        parent = parent.parent;
      }
      if (parent && parent.userData.selection.group)
      {
        object = parent;
      }      
      application.selectObjects(event, [object]);
    }
    else
    {
      selection.clear();
    }
  }
};
