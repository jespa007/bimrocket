/**
 * Inspector.js
 *
 * @author realor
 */

import { Panel } from "./Panel.js";
import { Tree } from "./Tree.js";
import { Dialog } from "./Dialog.js";
import { Application } from "./Application.js";
import { Expression } from "../utils/Expression.js";
import { Solid } from "../solid/Solid.js";
import { SolidGeometry } from "../solid/SolidGeometry.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class Inspector extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "inspector";
    this.position = "right";

    this.object = null;
    this.state = {};
    this.objectSectionName = 'Object';
    this.layerSectionName = 'Layer';
    this.geometrySectionName = 'Geometry';
    this.propertiesSectionName = "Properties";
    this.controllersSectionName = "Controllers";

    this.renderers = [
      new StringRenderer(this),
      new NumberRenderer(this),
      new BooleanRenderer(this),
      new VectorRenderer(this),
      new EulerRenderer(this),
      new ExpressionRenderer(this),
      new MaterialRenderer(this)];
    this.editors = [
      new StringEditor(this),
      new NumberEditor(this),
      new BooleanEditor(this),
      new VectorEditor(this),
      new EulerEditor(this),
      new ExpressionEditor(this)];
    this.edition =
    {
      object : null,
      propertyName : null,
      renderer : null,
      editor : null,
      propElem : null
    };

    application.addEventListener("selection", event =>
    {
      if (event.objects.length <= 1)
      {
        this.showProperties(event.objects[0]);
      }
      else
      {
        this.showSelectedObjects(event.objects);
      }
    });

    application.addEventListener("scene", event =>
    {
      if (event.type === "nodeChanged" &&
        application.selection.size === 1 &&
        event.objects.includes(application.selection.object) &&
        event.source !== this)
      {
        this.showProperties(application.selection.object);
      }
    });
    this.title = "tool.inspector.label";
  }

  showProperties(object)
  {
    if (this.edition.object) // edition in progress
    {
      this.stopEdition();
    }

    this.object = object;
    this.bodyElem.innerHTML = "";

    if (object)
    {
      var topListElem = document.createElement("ul");
      topListElem.className = "inspector";
      this.bodyElem.appendChild(topListElem);

      if (this.state[this.objectSectionName] === undefined)
      {
        this.state[this.objectSectionName] = "expanded";
      }
      var objListElem = this.createSection(this.objectSectionName, topListElem);
      this.createReadOnlyProperty("id", object.id, objListElem);
      for (var propertyName in object)
      {
        if (this.isSupportedProperty(propertyName))
        {
          if (this.isReadOnlyProperty(propertyName))
          {
            this.createReadOnlyProperty(propertyName, object[propertyName],
              objListElem);
          }
          else
          {
            this.createWriteableProperty(object, propertyName, objListElem);
          }
        }
      }
      if (object instanceof Solid)
      {
        this.createWriteableProperty(object, "edgesVisible", objListElem);
        this.createWriteableProperty(object, "facesVisible", objListElem);
      }

      var material = object.material;
      if (material)
      {
        this.createReadOnlyProperty("material", material, objListElem);
      }

      var geometry = object.geometry;
      if (geometry)
      {
        if (this.state[this.geometrySectionName] === undefined)
        {
          this.state[this.geometrySectionName] = "expanded";
        }
        var geomListElem = this.createSection(this.geometrySectionName,
          topListElem);

        this.createReadOnlyProperty("uuid", geometry.uuid, geomListElem);
        this.createReadOnlyProperty("type", geometry.type, geomListElem);

        if (geometry instanceof SolidGeometry)
        {
          this.createReadOnlyProperty("vertices",
            geometry.vertices.length, geomListElem);
          this.createReadOnlyProperty("faces",
            geometry.faces.length, geomListElem);
          this.createReadOnlyProperty("isManifold",
            geometry.isManifold, geomListElem);
        }
        else if (geometry instanceof THREE.BufferGeometry)
        {
          for (var name in geometry.attributes)
          {
            this.createReadOnlyProperty(name,
              geometry.attributes[name].array.length, geomListElem);
          }
        }
      }

      var userData = object.userData;
      if (this.state[this.propertiesSectionName] === undefined)
      {
        this.state[this.propertiesSectionName] = "expanded";
      }

      let propListElem = this.createSection(this.propertiesSectionName,
        topListElem, [this.createAddPropertyAction(object, userData)]);

      for (let propertyName in userData)
      {
        let propertyValue = userData[propertyName];
        if (propertyValue !== null && typeof propertyValue === "object")
        {
          let dictName = propertyName;
          let dictionary = propertyValue;
          if (this.state[dictName] === undefined)
          {
            this.state[dictName] = "expanded";
          }

          let dictListElem = this.createSection(dictName, propListElem,
            [this.createAddPropertyAction(object, dictionary)]);
          for (let dictPropertyName in dictionary)
          {
            this.createWriteableProperty(dictionary,
              dictPropertyName, dictListElem);
          }
        }
        else
        {
          this.createWriteableProperty(userData, propertyName, propListElem);
        }
      }

      let controllers = object.controllers;
      if (this.state[this.controllersSectionName] === undefined)
      {
        this.state[this.controllersSectionName] = "expanded";
      }
      let controllersListElem =
        this.createSection(this.controllersSectionName, topListElem);
      if (controllers)
      {
        for (let i = 0; i < controllers.length; i++)
        {
          let controller = controllers[i];
          let name = controller.constructor.type;
          if (controller.name) name += ":" + controller.name;
          if (this.state[name] === undefined)
          {
            this.state[name] = 'expanded';
          }
          let controlListElem = this.createSection(name, controllersListElem,
            [this.createRemoveControllerAction(controller)]);
          this.createWriteableProperty(controller, "name", controlListElem);

          for (let propertyName in controller)
          {
            let property = controller[propertyName];
            if (property instanceof Expression)
            {
              this.createProperty(property.label, property, controller,
                propertyName, controlListElem);
            }
          }
        }
      }
    }
  }

  getObjectClass(object)
  {
    if (object.type === "Object3D" &&
       object.userData.IFC && object.userData.IFC.ifcClassName)
    {
      return object.userData.IFC.ifcClassName;
    }
    else
    {
      return object.type;
    }
  }

  showSelectedObjects(objects)
  {
    this.bodyElem.innerHTML = "";

    const infoElem = document.createElement("div");
    infoElem.className = "inspector_info";
    I18N.set(infoElem, "innerHTML", "message.objects_selected", objects.length);
    this.application.i18n.update(infoElem);
    this.bodyElem.appendChild(infoElem);

    const selectionTree = new Tree(this.bodyElem);

    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
      let label = object.name || object.id;
      let className = this.getObjectClass(object);
      selectionTree.addNode(label,
        event => this.application.selectObjects(event, [object]), className);
    }
  }

  createSection(name, parentElem, actions = null)
  {
    let labelListener = event =>
    {
      let labelElem = event.srcElement || event.target;
      labelElem.className = (labelElem.className === 'expand') ?
        'collapse' : 'expand';
      let listElem = labelElem.parentNode.querySelector('ul');
      listElem.className = (listElem.className === 'expanded') ?
        'collapsed' : 'expanded';
      let sectionName = labelElem.id.substring(8);
      this.state[sectionName] = listElem.className;
    };

    let sectionElem = document.createElement("li");
    sectionElem.className = 'section';
    parentElem.appendChild(sectionElem);

    let labelElem = document.createElement('span');
    labelElem.id = 'section-' + name;
    labelElem.innerHTML = name;
    sectionElem.appendChild(labelElem);
    labelElem.className = this.state[name] === 'collapsed' ?
      'expand' : 'collapse';
    labelElem.addEventListener('click', labelListener);

    if (actions instanceof Array)
    {
      for (let k = 0; k < actions.length; k++)
      {
        let action = actions[k];
        let actionElem = document.createElement('span');
        actionElem.className = action.className;
        actionElem.alt = action.label;
        actionElem.title = action.label;
        actionElem.setAttribute("role", "button");
        actionElem.addEventListener("click", action.listener);
        sectionElem.appendChild(actionElem);
      }
    }

    let listElem = document.createElement("ul");
    listElem.className = this.state[name];
    sectionElem.appendChild(listElem);

    return listElem;
  }

  createReadOnlyProperty(propertyLabel, propertyValue, parentElem)
  {
    this.createProperty(propertyLabel, propertyValue, null, null, parentElem);
  }

  createWriteableProperty(object, propertyName, parentElem)
  {
    this.createProperty(null, null, object, propertyName, parentElem);
  };

  createProperty(propertyLabel, propertyValue, object, propertyName, parentElem)
  {
    if (propertyValue === null && object && propertyName)
    {
      propertyValue = object[propertyName];
    }
    let renderer = this.getRenderer(propertyValue);
    if (renderer)
    {
      let propElem = document.createElement('li');
      propElem.className = "property " + renderer.getClassName(propertyValue);
      parentElem.appendChild(propElem);
      if (!propertyLabel)
      {
        propertyLabel = propertyName;
      }
      let labelElem = document.createElement('span');
      labelElem.innerHTML = propertyLabel + ':';
      labelElem.className = 'label';
      propElem.appendChild(labelElem);

      let editor = object && propertyName ?
        this.getEditor(propertyValue) : null;

      this.createValueElem(propertyValue, renderer, editor,
        object, propertyName, propElem);

      if (editor)
      {
        labelElem.addEventListener("click", event =>
          this.startEdition(object, propertyName, renderer, editor, propElem),
          false);
        propElem.className += " editable";
      }
    }
  }

  createValueElem(propertyValue, renderer, editor, object,
    propertyName, propElem)
  {
    let valueElem = renderer.render(propertyValue, propElem);
    if (editor)
    {
      valueElem.addEventListener("click", () =>
        this.startEdition(object, propertyName, renderer, editor, propElem),
        false);
    }
  }

  createAddPropertyAction(object, dictionary)
  {
    const application = this.application;

    const listener = () =>
    {
      const dialog = new Dialog("title.object_properties");
      dialog.setSize(240, 210);
      dialog.setI18N(application.i18n);
      let nameElem = dialog.addTextField("propertyName",
        "label.property_name", "");
      let typeElem = dialog.addSelectField("propertyType",
        "label.property_type", ["string", "number", "boolean", "object"]);
      let valueElem = dialog.addTextField("propertyValue",
       "label.property_value", "");

      dialog.addButton("accept", "button.accept", () =>
      {
        dialog.hide();
        let propertyName = nameElem.value;
        let propertyType = typeElem.value;
        let propertyValue = valueElem.value;
        switch (propertyType)
        {
          case "string":
            dictionary[propertyName] = propertyValue;
            break;
          case "number":
            dictionary[propertyName] = Number(propertyValue);
            break;
          case "boolean":
            dictionary[propertyName] = Boolean(propertyValue);
            break;
          case "object":
            dictionary[propertyName] = {};
            break;
        }
        this.showProperties(object);
      });
      dialog.addButton("cancel", "button.cancel", () => dialog.hide());
      dialog.show();
      nameElem.focus();
    };

    return {
      className: "add_button",
      label: "Add property",
      listener : listener
    };
  }

  createRemoveControllerAction(controller)
  {
    const listener = () =>
    {
      controller.stop();
      let object = controller.object;
      let index = object.controllers.indexOf(controller);
      if (index !== -1)
      {
        object.controllers.splice(index, 1);
        this.showProperties(object);
      }
    };

    return {
      className: "remove_button",
      label: "Remove controller",
      listener : listener
    };
  }

  startEdition(object, propertyName, renderer, editor, propElem)
  {
    if (this.edition.object !== null)
    {
      this.stopEdition();
    }

    let propertyValue = object[propertyName];
    let valueElem = propElem.childNodes[propElem.childNodes.length - 1];
    propElem.removeChild(valueElem);

    this.edition.object = object;
    this.edition.propertyName = propertyName;
    this.edition.renderer = renderer;
    this.edition.editor = editor;
    this.edition.propElem = propElem;

    editor.edit(propertyValue, propElem);
  }

  endEdition(value)
  {
    let object = this.edition.object;
    let propertyName = this.edition.propertyName;
    let oldValue = object[propertyName];

    if (oldValue !== null && typeof oldValue === "object")
    {
      if (typeof oldValue.copy === "function")
      {
        object[propertyName].copy(value);
        if (object instanceof THREE.Object3D)
        {
          object.updateMatrix();
        }
      }
      else
      {
        object[propertyName] = value;
      }
    }
    else
    {
      object[propertyName] = value;
    }
    this.stopEdition();

    let changeEvent = {type: "nodeChanged", objects: [this.object],
      source : this};
    this.application.notifyEventListeners("scene", changeEvent);
  }

  stopEdition()
  {
    let propElem = this.edition.propElem;
    let valueElem = propElem.childNodes[propElem.childNodes.length - 1];
    propElem.removeChild(valueElem);
    let propertyValue = this.edition.object[this.edition.propertyName];

    this.createValueElem(propertyValue, this.edition.renderer,
      this.edition.editor, this.edition.object, this.edition.propertyName,
      propElem);

    this.edition.object = null;
    this.edition.propertyName = null;
    this.edition.renderer = null;
    this.edition.editor = null;
    this.edition.propElem = null;
  }

  isSupportedProperty(propertyName)
  {
    if (propertyName[0] === '_') return false;
    if (propertyName === 'material') return false;
    return true;
  }

  isReadOnlyProperty(propertyName)
  {
    if (propertyName === 'type') return true;
    if (propertyName === 'uuid') return true;
    if (propertyName.indexOf("is") === 0) return true;

    return false;
  }

  getRenderer(value)
  {
    let renderer = null;
    let i = 0;
    while (i < this.renderers.length && renderer === null)
    {
      if (this.renderers[i].isSupported(value))
      {
        renderer = this.renderers[i];
      }
      else i++;
    }
    return renderer;
  }

  getEditor(value)
  {
    let editor = null;
    let i = 0;
    while (i < this.editors.length && editor === null)
    {
      if (this.editors[i].isSupported(value))
      {
        editor = this.editors[i];
      }
      else i++;
    }
    return editor;
  }
};

/* PropertyRenderers */

class PropertyRenderer
{
  constructor(inspector)
  {
    this.inspector = inspector;
  }

  isSupported(value, type)
  {
    return false;
  }

  getClassName(value)
  {
    return "";
  }

  render(value, propElem) // returns elem
  {
    return null;
  }
}

class StringRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "string";
  }

  getClassName(value)
  {
    return "string";
  }

  render(text, propElem)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    valueElem.innerHTML = text;
    propElem.appendChild(valueElem);
    return valueElem;
  }
}

class NumberRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "number";
  }

  getClassName(value)
  {
    return "number";
  }

  render(number, propElem)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    valueElem.innerHTML = Math.round(number * 1000) / 1000;
    propElem.appendChild(valueElem);
    return valueElem;
  }
}

class BooleanRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "boolean";
  }

  getClassName(value)
  {
    return "boolean";
  }

  render(value, propElem)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    valueElem.innerHTML = value;
    propElem.appendChild(valueElem);
    return valueElem;
  }
}

class VectorRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Vector3;
  }

  getClassName(value)
  {
    return "vector";
  }

  render(vector, propElem)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    let round = function(value)
    {
      var precision = 1000;
      return Math.round(precision * value) / precision;
    };
    let out = '(' + round(vector.x) + ', ' +
      round(vector.y) + ', ' +
      round(vector.z) + ')';
    valueElem.innerHTML = out;
    propElem.appendChild(valueElem);
    return valueElem;
  }
}

class EulerRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Euler;
  }

  getClassName(value)
  {
    return "euler";
  }

  render(euler, propElem)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    let angle = function(value)
    {
      var precision = 1000;
      return Math.round(precision *
        THREE.MathUtils.radToDeg(value)) / precision;
    };
    let out = '(' + angle(euler.x) + 'º, ' +
      angle(euler.y) + 'º, ' +
      angle(euler.z) + 'º)';
    valueElem.innerHTML = out;
    propElem.appendChild(valueElem);
    return valueElem;
  }
}

class ExpressionRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof Expression;
  }

  getClassName(property)
  {
    return property.type;
  }

  render(property, propElem)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    if (property.definition)
    {
      valueElem.innerHTML = "${" + property.definition + "}";
    }
    else
    {
      valueElem.innerHTML = property.value;
    }
    propElem.appendChild(valueElem);
    return valueElem;
  }
};

class MaterialRenderer extends PropertyRenderer
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Material;
  }

  getClassName(value)
  {
    return "material";
  }

  render(material, propElem)
  {
    let valueElem = document.createElement("span");
    valueElem.className = "value";
    if (material.name)
    {
      let nameElem = document.createElement("span");
      nameElem.className = "name";
      nameElem.innerHTML = material.name;
      valueElem.appendChild(nameElem);
    }
    if (material.color)
    {
      let colorElem = document.createElement("span");
      colorElem.className = "color";
      let color = material.color;
      let rgb = "rgb(" + Math.round(255 * color.r) +
        "," + Math.round(255 * color.g) + "," + Math.round(255 * color.b) + ")";
      colorElem.style.backgroundColor = rgb;
      colorElem.alt = rgb;
      colorElem.title = rgb;
      valueElem.appendChild(colorElem);
    }
    propElem.appendChild(valueElem);
    return valueElem;
  }
}

/* PropertyEditors */

class PropertyEditor
{
  constructor(inspector)
  {
    this.inspector = inspector;
  }

  isSupported(value)
  {
    return false;
  }

  edit(value, propElem) // returns elem
  {
    return null;
  }
}

class StringEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "string";
  }

  edit(text, propElem)
  {
    let valueElem = document.createElement("input");
    valueElem.className = "value";
    valueElem.value = text;
    valueElem.addEventListener("keyup", event =>
    {
      if (event.keyCode === 13)
      {
        this.inspector.endEdition(valueElem.value);
      }
      else if (event.keyCode === 27)
      {
        this.inspector.stopEdition();
      }
    }, false);
    propElem.appendChild(valueElem);
    valueElem.focus();
    return valueElem;
  }
}

class NumberEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "number";
  }

  edit(number, propElem)
  {
    let valueElem = document.createElement("input");
    valueElem.className = "value";
    valueElem.value = "" + number;
    valueElem.type = "number";
    valueElem.addEventListener("keyup", event =>
    {
      if (event.keyCode === 13)
      {
        number = parseFloat(valueElem.value);
        if (!isNaN(number))
        {
          this.inspector.endEdition(number);
        }
      }
      else if (event.keyCode === 27)
      {
        this.inspector.stopEdition();
      }
    }, false);
    propElem.appendChild(valueElem);
    valueElem.focus();
    return valueElem;
  }
}

class BooleanEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return typeof value === "boolean";
  }

  edit(value, propElem)
  {
    let valueElem = document.createElement("span");
    propElem.appendChild(valueElem);

    let checked = value;
    this.inspector.endEdition(!checked);
  }
}

class DimensionEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  formatValue(value)
  {
    return value;
  }

  createInstance(x, y, z)
  {
    return {"x": x, "y": y, "z": z};
  }

  edit(vector, propElem)
  {
    let dimId = "dim_edit_";

    const parseDimension = dim =>
    {
      let valueElem = document.getElementById(dimId + dim);
      let value = valueElem.value;
      let num = parseFloat(value);
      return isNaN(num) ? vector[dim] : num;
    };

    const endEdition = () =>
    {
      let x = parseDimension("x");
      let y = parseDimension("y");
      let z = parseDimension("z");
      this.inspector.endEdition(this.createInstance(x, y, z));
    };

    const keyListener = event =>
    {
      if (event.keyCode === 13)
      {
        endEdition();
      }
      else if (event.keyCode === 27)
      {
        this.inspector.stopEdition();
      }
    };

    const createDimensionEditor = (vector, dim) =>
    {
      let itemElem = document.createElement("li");

      let labelElem = document.createElement("label");
      labelElem.innerHTML = dim + ":";
      labelElem.htmlFor = dimId + dim;

      let valueElem = document.createElement("input");
      valueElem.id = dimId + dim;
      valueElem.type = "number";
      valueElem.className = "value";
      valueElem.value = this.formatValue(vector[dim]);

      valueElem.addEventListener("keyup", keyListener, false);

      itemElem.appendChild(labelElem);
      itemElem.appendChild(valueElem);

      return itemElem;
    };

    let listElem = document.createElement("ul");
    listElem.className = "list_3";
    listElem.appendChild(createDimensionEditor(vector, "x"));
    listElem.appendChild(createDimensionEditor(vector, "y"));
    listElem.appendChild(createDimensionEditor(vector, "z"));
    propElem.appendChild(listElem);

    document.getElementById(dimId + "x").focus();

    return listElem;
  }
}

class VectorEditor extends DimensionEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Vector3;
  }

  createInstance(x, y, z)
  {
    return new THREE.Vector3(x, y, z);
  }
}

class EulerEditor extends DimensionEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof THREE.Euler;
  }

  formatValue(value)
  {
    const precision = 10000000;
    return Math.round(precision * THREE.MathUtils.radToDeg(value)) / precision;
  }

  createInstance(x, y, z)
  {
    let xrad = THREE.MathUtils.degToRad(x);
    let yrad = THREE.MathUtils.degToRad(y);
    let zrad = THREE.MathUtils.degToRad(z);

    return new THREE.Euler(xrad, yrad, zrad, "XYZ");
  }
}

class ExpressionEditor extends PropertyEditor
{
  constructor(inspector)
  {
    super(inspector);
  }

  isSupported(value)
  {
    return value instanceof Expression;
  }

  edit(property, propElem) // returns elem
  {
    let valueElem = document.createElement("input");
    valueElem.className = "value";

    if (property.definition)
    {
      valueElem.value = "${" + property.definition + "}";
    }
    else
    {
      valueElem.value = property.value;
    }
    valueElem.addEventListener("keyup", event =>
    {
      if (event.keyCode === 13)
      {
        let expr = valueElem.value;
        if (expr.match(/\${.*}/))
        {
          property.definition = expr.substring(2, expr.length - 1);
          this.inspector.endEdition(property);
        }
        else
        {
          property.definition = null;
          property.value = expr;
        }
      }
      else if (event.keyCode === 27)
      {
        this.inspector.stopEdition();
      }
    }, false);
    propElem.appendChild(valueElem);
    valueElem.focus();
    return valueElem;
  }
}

export { Inspector };