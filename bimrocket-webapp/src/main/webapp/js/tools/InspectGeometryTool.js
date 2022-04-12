/*
 * InspectGeometryTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Tree } from "../ui/Tree.js";
import { TabbedPane } from "../ui/TabbedPane.js";
import { Controls } from "../ui/Controls.js";
import { Solid } from "../core/Solid.js";
import { SolidOptimizer } from "../core/SolidOptimizer.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class InspectGeometryTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "inspect_geometry";
    this.label = "tool.inspect_geometry.label";
    this.className = "inspect_geometry";

    this.object = null;
    this.selectedNode = null;
    this.highlightGroup = null;
    this.lineMaterial = new THREE.LineBasicMaterial(
      { color : 0, linewidth : 1.5, depthTest : false, transparent : true });
    this.pointsMaterial = new THREE.PointsMaterial(
      { color : 0, size: 4, sizeAttenuation : false, depthTest : false,
        transparent : true });
    this.vertexMaterial = new THREE.PointsMaterial(
      { color : 0x000080, size: 8, sizeAttenuation : false, depthTest : false, 
        transparent : true });

    this.sceneUuid = null;

    this.setOptions(options);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.bodyElem.classList.add("padding");
    
    this.tabbedPane = new TabbedPane(this.panel.bodyElem);

    const geometryInventoryPanel = 
      this.tabbedPane.addTab("geom_inventory", "label.geometry_inventory");    
    geometryInventoryPanel.classList.add("inspect_geometry");

    const geometryPanel = this.tabbedPane.addTab("geom_detail", 
      "label.geometry_detail");
    geometryPanel.classList.add("inspect_geometry");

    // geometry inventory panel
    this.searchButton = Controls.addButton(geometryInventoryPanel,
      "geom_search", "button.search", () => this.searchGeometries());

    this.geometryTable = Controls.addTable(geometryInventoryPanel, "geom_table", 
      ["label.geometry_id", "label.geometry_instances", 
        "label.geometry_triangles", "label.geometry_total_triangles"], "data");
    
    this.geometryTable.style.display = "none";

    // geometry panel
    this.messageElem = document.createElement("div");
    geometryPanel.appendChild(this.messageElem);
    I18N.set(this.messageElem, "innerHTML", "tool.inspect_geometry.help");

    this.listElem = document.createElement("ul");
    this.listElem.className = "summary";
    geometryPanel.appendChild(this.listElem);

    this.objectNameElem = document.createElement("li");
    this.listElem.appendChild(this.objectNameElem);

    this.geometryIdElem = document.createElement("li");
    this.listElem.appendChild(this.geometryIdElem);

    this.vertexCountElem = document.createElement("li");
    this.listElem.appendChild(this.vertexCountElem);

    this.faceCountElem = document.createElement("li");
    this.listElem.appendChild(this.faceCountElem);

    this.isManifoldElem = document.createElement("li");
    this.listElem.appendChild(this.isManifoldElem);

    this.optimizeButton = Controls.addButton(geometryPanel,
      "optimize", "button.optimize", () => this.optimize());
    this.optimizeButton.style.display = "none";

    this.geometryTree = new Tree(geometryPanel);

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onSelection = this.onSelection.bind(this);
  }

  activate()
  {
    const application = this.application;
    const container = application.container;
    container.addEventListener('pointerdown', this._onPointerDown, false);
    application.addEventListener('selection', this._onSelection, false);

    if (this.sceneUuid !== application.scene.uuid)
    {
      this.geometryTable.tBodies[0].innerHTML = "";
      this.geometryTable.style.display = "none";
    }

    this.panel.visible = true;

    let object = application.selection.object;
    if (object instanceof Solid)
    {
      if (object !== this.object)
      {
        this.showSolid(object);
      }
    }
    else
    {
      this.clear();
    }
  }

  deactivate()
  {
    const application = this.application;
    const container = application.container;
    container.removeEventListener('pointerdown', this._onPointerDown, false);
    application.removeEventListener('selection', this._onSelection, false);

    this.panel.visible = false;
  }

  onPointerDown(event)
  {
    if (!this.isCanvasEvent(event)) return;

    const application = this.application;
    const pointerPosition = this.getEventPosition(event);
    const baseObject = application.baseObject;
    const intersect = this.intersect(pointerPosition, baseObject, true);
    if (intersect)
    {
      let object = intersect.object;
      application.selection.set(object);
      this.tabbedPane.showTab("geom_detail");
    }
    else
    {
      application.selection.clear();
    }
  }

  onSelection()
  {
    const application = this.application;
    const object = application.selection.object;
    if (object instanceof Solid)
    {
      if (object !== this.object)
      {
        this.showSolid(object);
      }
    }
    else
    {
      this.clear();
    }
  }

  showSolid(solid)
  {
    this.object = solid;
    this.clearHighlight();
    this.messageElem.style.display = "none";

    this.listElem.style.display = "";
    I18N.set(this.objectNameElem, "innerHTML", "message.object_name",
      solid.name);
    I18N.set(this.geometryIdElem, "innerHTML", "message.geometry_id",
      solid.geometry.id);
    I18N.set(this.faceCountElem, "innerHTML", "message.face_count",
      solid.geometry.faces.length);
    I18N.set(this.vertexCountElem, "innerHTML", "message.vertex_count",
      solid.geometry.vertices.length);
    I18N.set(this.isManifoldElem, "innerHTML", "message.is_manifold",
      solid.geometry.isManifold);
    this.application.i18n.updateTree(this.listElem);

    this.optimizeButton.style.display = "";

    const tree = this.geometryTree;
    tree.clear();
    let geometry = solid.geometry;
    const vertices = geometry.vertices;

    const round = x =>
    {
      return Math.round(x * 1000) / 1000;
    };

    const vector2String = (vector) =>
    {
      return "(" +round(vector.x) + ", " +
          round(vector.y) + ", " + round(vector.z) + ")";
    };

    const addVertices = (node, loop) =>
    {
      const indices = loop.indices;
      for (let i = 0; i < indices.length; i++)
      {
        let vertex = vertices[loop.indices[i]];
        let vertexNode = node.addNode(
          "v-" + loop.indices[i] + ": " + vector2String(vertex),
          () => this.highlight(vertexNode, solid, [loop], vertex), "vertex");
      }
    };

    for (let f = 0; f < geometry.faces.length; f++)
    {
      let face = geometry.faces[f];
      let label = "face-" + f + " (" + face.outerLoop.indices.length + "v";
      if (face.holes.length > 0) label += ", " + face.holes.length + "h)";
      else label += ")";

      let faceNode = tree.addNode(label,
        () => this.highlight(faceNode, solid,
        [face.outerLoop, ...face.holes]),
        "face" + (face.holes.length > 0 ? " holes" : ""));
      faceNode.addNode("normal: " + vector2String(face.normal),
        () => {}, "normal");

      let outerNode = faceNode.addNode("outerLoop (" +
        face.outerLoop.indices.length + "v)",
        () => this.highlight(outerNode, solid, [face.outerLoop]), "loop");
      addVertices(outerNode, face.outerLoop);
      for (let h = 0; h < face.holes.length; h++)
      {
        let hole = face.holes[h];
        let holeNode = faceNode.addNode("hole-" + h +
          " (" + hole.indices.length + "v)",
          () => this.highlight(holeNode, solid, [hole]), "hole");
        addVertices(holeNode, hole);
      }
    }
  }

  clear()
  {
    this.geometryTree.clear();
    this.object = null;
    this.clearHighlight();
    this.messageElem.style.display = "";
    this.listElem.style.display = "none";
    this.optimizeButton.style.display = "none";
  }

  addLoop(solid, loop)
  {
    const vertices = [];
    const indices = loop.indices;
    const matrixWorld = solid.matrixWorld;

    for (let i = 0; i <= indices.length; i++)
    {
      vertices.push(loop.getVertex(i % indices.length).clone()
        .applyMatrix4(matrixWorld));
    }

    let geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(vertices);

    let lines = new THREE.Line(geometry, this.lineMaterial);
    lines.raycast = function() {};
    this.highlightGroup.add(lines);

    let points = new THREE.Points(geometry, this.pointsMaterial);
    points.raycast = function() {};
    this.highlightGroup.add(points);
  }

  highlight(node, solid, loops, vertex)
  {
    if (this.selectedNode !== null)
    {
      this.selectedNode.removeClass("selected");
    }
    node.addClass("selected");
    this.selectedNode = node;

    if (this.highlightGroup !== null)
    {
      this.application.removeObject(this.highlightGroup);
    }
    this.highlightGroup = new THREE.Group();
    this.highlightGroup.renderOrder = 2;

    for (let loop of loops)
    {
      this.addLoop(solid, loop);
    }

    if (vertex)
    {
      let geometry = new THREE.BufferGeometry();
      geometry.setFromPoints([vertex.clone().applyMatrix4(solid.matrixWorld)]);
      let points = new THREE.Points(geometry, this.vertexMaterial);
      points.raycast = function() {};
      this.highlightGroup.add(points);
    }

    this.application.addObject(this.highlightGroup, this.application.overlays);
  }

  clearHighlight()
  {
    if (this.highlightGroup !== null)
    {
      this.application.removeObject(this.highlightGroup);
      this.highlightGroup = null;
    }
    if (this.selectedNode !== null)
    {
      this.selectedNode.removeClass("selected");
      this.selectedNode = null;
    }
  }

  optimize()
  {
    const object = this.object;
    if (object !== null && object.type === "Solid")
    {
      let optimizer = new SolidOptimizer(object.geometry);
      let geometry = optimizer.optimize();
      object.updateGeometry(geometry);
      this.showSolid(object);
      this.application.notifyObjectsChanged(object);
      console.info(optimizer);
    }
  }
  
  searchGeometries()
  {
    const application = this.application;
    this.sceneUuid = application.scene.uuid;
    let geometryMap = new Map();

    function traverse(object)
    {
      if (!object.visible) return;
      
      if (object instanceof Solid)
      {
        let geometry = object.geometry;
        let entry = geometryMap.get(geometry.id);
        if (entry === undefined)
        {
          entry = 
          {
            geometry : geometry,
            triangleCount : geometry.getTriangleCount(),
            instances : []
          };
          geometryMap.set(geometry.id, entry);
        }
        entry.instances.push(object);
      }
      else
      {
        const children = object.children;
        for (let child of children)
        {
          traverse(child);
        }
      }
    }

    traverse(application.baseObject);

    this.geometryTable.tBodies[0].innerHTML = "";
    
    let entries = Array.from(geometryMap.values());
    entries.sort((a, b) => 
    {
      let sizeA = a.triangleCount * a.instances.length;
      let sizeB = b.triangleCount * b.instances.length;
      return sizeB - sizeA;
    });
    
    for (let entry of entries)
    {
      let rowElem = Controls.addTableRow(this.geometryTable);
      rowElem.children[0].innerHTML = entry.geometry.id;
      let instanceLink = document.createElement("a");
      instanceLink.href = "#";
      instanceLink.innerHTML = "" + entry.instances.length;
      instanceLink.addEventListener("click", () => this.showInstances(entry));      
      rowElem.children[1].appendChild(instanceLink);
      rowElem.children[2].innerHTML = entry.triangleCount;
      rowElem.children[3].innerHTML = 
        entry.triangleCount * entry.instances.length;
    }
    this.geometryTable.style.display = "";
  }
  
  showInstances(entry)
  {
    this.application.selection.set(...entry.instances);
  }
}

export { InspectGeometryTool };