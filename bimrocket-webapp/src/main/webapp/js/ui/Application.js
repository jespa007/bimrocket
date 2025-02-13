/**
 * Application.js
 *
 * @author realor
 */

import { Panel, PanelManager } from "../ui/Panel.js";
import { ProgressBar } from "../ui/ProgressBar.js";
import { MenuBar } from "../ui/Menu.js";
import { Tool } from "../tools/Tool.js";
import { ToolBar } from "../ui/ToolBar.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { Cord } from "../core/Cord.js";
import { Profile } from "../core/Profile.js";
import { Solid } from "../core/Solid.js";
import { Cloner } from "../builders/Cloner.js";
import { ObjectBuilder } from "../builders/ObjectBuilder.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ServiceManager } from "../io/ServiceManager.js";
import { IOManager } from "../io/IOManager.js";
import { Selection } from "../utils/Selection.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { WebUtils } from "../utils/WebUtils.js";
import { ModuleLoader } from "../utils/ModuleLoader.js";
import { WEBGL } from "../utils/WebGL.js";
import { PointSelector } from "../utils/PointSelector.js";
import { LineDashedShaderMaterial } from "../materials/LineDashedShaderMaterial.js";
import { Inspector } from "../ui/Inspector.js";
import { FakeRenderer } from "../renderers/FakeRenderer.js";
import { Formula } from "../formula/Formula.js";
import { LoginDialog } from "./LoginDialog.js";
import { ScriptDialog } from "./ScriptDialog.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class Application
{
  static NAME = "BIMROCKET";
  static VERSION = "$VERSION$";
  static EDGES_SELECTION = "edges";
  static FACES_SELECTION = "faces";
  static UNITS = [
    ["km", "units.km"],
    ["m", "units.m"],
    ["cm", "units.cm"],
    ["mm", "units.mm"],
    ["in", "units.in"]
  ];
  static SET_SELECTION_MODE = "set";
  static ADD_SELECTION_MODE = "add";
  static REMOVE_SELECTION_MODE = "remove";

  constructor(element = document.body)
  {
    this.element = element;
    this.i18n = new I18N();
    this.scene = null;
    this.camera = null;
    this.perspectiveCamera = null;
    this.orthographicCamera = null;
    this.baseObject = null;
    this.clippingPlane = null;
    this.clippingGroup = null;
    this.overlays = null;
    this.tools = {};
    this.tool = null;
    this._units = null;
    this._decimals = null;
    this._backgroundColor1 = null;
    this._backgroundColor2 = null;
    this._panelOpacity = null;
    this._frameRateDivisor = null;
    this._shadowsEnabled = null;

    /* services */
    this.services = {}; // Service instances

    /* selection */
    this.selection = new Selection(this, true);
    this.selectionMode = Application.SET_SELECTION_MODE;
    this.selectionPaintMode = Application.EDGES_SELECTION;
    this._showDeepSelection = null;
    this._showLocalAxes = null;
    this._selectionLines = null;
    this._axisLines = null;

    this.clock = new THREE.Clock();

    this.autoRepaint = false;
    this.needsRepaint = true;

    /* internal properties */
    this._cutObjects = [];
    this._eventListeners = {
      scene : [],
      selection : [],
      animation : [],
      tool : []
    };

    this.loadingManager = new THREE.LoadingManager();
    const loadingManager = this.loadingManager;
    loadingManager.onStart = (url, itemsLoaded, itemsTotal) =>
    {
      if (!url.startsWith("data:"))
      {
        console.info(url, itemsLoaded, itemsTotal);
      }
    };
    loadingManager.onLoad = () =>
    {
      console.info("Load completed.");
      this.repaint();
    };

   	THREE.Object3D.DefaultMatrixAutoUpdate = false;
   	THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);
    THREE.Object3D.HIDDEN_PREFIX = ".";

    /* create sub elements */
    const logoPanelElem = document.createElement("div");
    logoPanelElem.className = "logo_panel";
    logoPanelElem.addEventListener("click", () => this.hideLogo());
    this.logoPanel = logoPanelElem;
    element.appendChild(logoPanelElem);

    const bigLogoImage = document.createElement("img");
    bigLogoImage.src = "css/images/bimrocket.svg";
    bigLogoImage.title = Application.NAME;
    bigLogoImage.alt = Application.NAME;
    logoPanelElem.appendChild(bigLogoImage);

    const headerElem = document.createElement("header");
    element.appendChild(headerElem);
    const logoLink = document.createElement("a");
    logoLink.className = "logo_link";
    logoLink.addEventListener("click", event => this.showLogo());
    headerElem.appendChild(logoLink);

    const logoImage = document.createElement("img");
    logoImage.src = "css/images/bimrocket.svg";
    logoImage.title = Application.NAME;
    logoImage.alt = Application.NAME;
    logoLink.appendChild(logoImage);

    const toolBarElem = document.createElement("div");
    toolBarElem.className = "toolbar";
    element.appendChild(toolBarElem);

    const container = document.createElement("div");
    container.className = "container";
    container.style.touchAction = "none";
    this.container = container;
    element.appendChild(container);

    const progressBarElem = document.createElement("div");
    progressBarElem.className = "progress_bar";
    element.appendChild(progressBarElem);

    this.restoreBackground();
    this.updateBackground();

    // renderer
    let renderer;
    if (WEBGL.isWebGLAvailable())
    {
      // WebGL renderer
      renderer = new THREE.WebGLRenderer(
      {
        antialias : true,
        alpha : true,
        preserveDrawingBuffer : true
      });
      renderer.shadowMap.enabled = this.shadowsEnabled;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    else
    {
      // fake renderer
      renderer = new FakeRenderer();
    }
    this.renderer = renderer;
    renderer.alpha = true;
    renderer.setClearColor(0x000000, 0);
    renderer.sortObjects = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // panelManager
    this.panelManager = new PanelManager(container);

    // general tabbed panel
    this.progressBar = new ProgressBar(progressBarElem);

    // menuBar
    this.menuBar = new MenuBar(this, headerElem);

     // toolBar
    this.toolBar = new ToolBar(this, toolBarElem);

    /* selection materials */

    const selectionColor = new THREE.Color(0, 0, 1);

    this.selectionMaterial = new THREE.LineBasicMaterial(
      { color: selectionColor, linewidth: 1.5,
        depthTest: true, depthWrite: true,
        polygonOffset: true, polygonOffsetFactor: 2, transparent : true });

    this.deepSelectionMaterial = new THREE.LineBasicMaterial(
      { color: selectionColor, linewidth: 1,
        depthTest: false, depthWrite: false, transparent : true });

    this.boxSelectionMaterial = new THREE.LineBasicMaterial(
      { color: selectionColor, linewidth: 1.5,
        depthTest: true, depthWrite: true,
        polygonOffset: true, polygonOffsetFactor: 2 });

    this.invisibleSelectionMaterial = new LineDashedShaderMaterial(
      { color: selectionColor, dashSize: 4, gapSize: 4,
        depthTest: true, depthWrite: true });

    this.deepInvisibleSelectionMaterial = new LineDashedShaderMaterial(
      { color: selectionColor, dashSize: 4, gapSize: 4,
        depthTest: false, depthWrite: false, transparent : true });


    this.pointSelector = new PointSelector(this);

    // set language
    this.i18n.userLanguages = window.localStorage.getItem("bimrocket.language")
      || navigator.language;

    // init scene
    this.initScene();

    // listeners
    this.addEventListener("scene", event =>
    {
      if (event.type === "cameraActivated")
      {
        this.repaint();
      }
      else if (event.type !== "cut")
      {
        if (event.type === "nodeChanged")
        {
          let updateSelection = false;
          for (let object of event.objects)
          {
            if (event.source !== ObjectBuilder)
            {
              object.needsRebuild = true;
            }

            if (object instanceof THREE.Camera &&
                event.source instanceof Inspector)
            {
              // inspector has changed a camera
              const camera = object;
              camera.updateProjectionMatrix();
            }
            else if (this.selection.contains(object))
            {
              updateSelection = true;
            }
          }

          if (updateSelection) this.updateSelection();
        }
        else if (event.type === "added" || event.type === "removed")
        {
          event.parent.needsRebuild = true;
        }
        this.repaint();
      }
    });

    this.addEventListener("selection", event =>
    {
      if (event.type === "changed")
      {
        this.updateSelection();
      }
    });

    window.addEventListener("resize", this.onResize.bind(this), false);

    window.addEventListener("beforeunload", event =>
    {
      if (this.baseObject.children.length > 0)
      {
        event.preventDefault();
        event.returnValue = "";
      }
    });

    // animation
    let __animationEvent = {delta : 0};
    let __animationCounter = 0;
    let animate = () =>
    {
      requestAnimationFrame(animate);

      __animationEvent.delta = this.clock.getDelta();
      if (this._eventListeners.animation.length > 0)
      {
        this.notifyEventListeners('animation', __animationEvent);
      }

      __animationCounter++;
      if (__animationCounter >= this.frameRateDivisor)
      {
        __animationCounter = 0;

        if (this.autoRepaint || this.needsRepaint)
        {
          this.render();
        }
      }
    };

    animate();
  }

  initScene()
  {
    const container = this.container;

    if (this.scene)
    {
      ObjectUtils.dispose(this.scene);
      this.stopControllers();
    }

    this.scene = new THREE.Scene();
    const scene = this.scene;
    scene.userData.selection = { "type" : "none" };
    scene.name = "Scene";

    // Add lights
    const hemisphereLight = new THREE.HemisphereLight(0xf0f0f0, 0x808080, 1);
    hemisphereLight.name = "HemisphereLight";
    hemisphereLight.updateMatrix();
    scene.add(hemisphereLight);

    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    sunLight.position.x = 20;
    sunLight.position.y = 20;
    sunLight.position.z = 80;
    sunLight.name = "SunLight";
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.camera.far = 3000;
    sunLight.shadow.camera.near = 0.01;
    sunLight.shadow.camera.matrixAutoUpdate = true;
    sunLight.shadow.bias = -0.0001;
    sunLight.target = scene;
    scene.add(sunLight);
    sunLight.updateMatrix();

    // initial camera
    let camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -2000, 2000);
    camera.position.set(0, -30, 2);
    camera.name = "Orthographic";
    camera.updateProjectionMatrix();
    camera.updateMatrix();
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.updateMatrix();
    scene.add(camera);
    this.orthographicCamera = camera;

    camera = new THREE.PerspectiveCamera(60,
      container.clientWidth / container.clientHeight, 0.1, 4000);
    camera.position.set(0, -10, 0.2);
    camera.name = "Perspective";
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    camera.updateMatrix();
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.updateMatrix();
    scene.add(camera);
    this.perspectiveCamera = camera;

    this.camera = camera;

    // Add base group
    this.baseObject = new THREE.Group();
    const baseObject = this.baseObject;
    baseObject.name = "Base";
    baseObject.userData.selection = {type : "none"};

    baseObject.updateMatrix();

    scene.add(baseObject);

    // Add clipping group
    this.clippingGroup = new THREE.Group();
    this.clippingGroup.name = THREE.Object3D.HIDDEN_PREFIX + "clipping";
    this.scene.add(this.clippingGroup);

    // Add overlays group
    this.overlays = new THREE.Group();
    this.overlays.name = THREE.Object3D.HIDDEN_PREFIX + "overlays";
    this.scene.add(this.overlays);

    let sceneEvent = {type : "structureChanged",
      objects : [this.scene], source : this};
    this.notifyEventListeners("scene", sceneEvent);

    this.selection.set(baseObject);
  }

  render()
  {
    this.renderer.render(this.scene, this.camera);
    this.needsRepaint = false;
  }

  repaint()
  {
    this.needsRepaint = true;
  }

  /* gets the model root depending on selection */
  getModelRoot(lowestRoot = false)
  {
    let root;
    const roots = this.selection.roots;
    const baseObject = this.baseObject;

    if (roots.length === 0) // nothing selected
    {
      if (baseObject.children.length === 1)
      {
        root = baseObject.children[0];
      }
      else
      {
        root = baseObject;
      }
    }
    else if (roots.length === 1)
    {
      root = roots[0];
      if (!lowestRoot)
      {
        // find top root (under baseObject)
        while (root.parent !== baseObject &&
               root !== this.scene && root !== baseObject)
        {
          root = root.parent;
        }
      }
    }
    else // multiple roots
    {
      root = baseObject;
    }
    return root;
  }

  get units()
  {
    if (this._units === null)
    {
      this._units = window.localStorage.getItem("bimrocket.units") || "m";
    }
    return this._units;
  }

  set units(units)
  {
    this._units = units;
    window.localStorage.setItem("bimrocket.units", units);
  }

  get decimals()
  {
    if (this._decimals === null)
    {
      this._decimals = parseInt(window.localStorage.getItem(
       "bimrocket.decimals") || "2");
    }
    return this._decimals;
  }

  set decimals(decimals)
  {
    this._decimals = decimals;
    window.localStorage.setItem("bimrocket.decimals", String(decimals));
  }

  get backgroundColor()
  {
    return this._backgroundColor1;
  }

  set backgroundColor(color)
  {
    this._backgroundColor1 = color;
    this._backgroundColor2 = color;
    this.updateBackground();
    this.saveBackground();
  }

  get backgroundColor1()
  {
    return this._backgroundColor1;
  }

  set backgroundColor1(color)
  {
    this._backgroundColor1 = color;
    this.updateBackground();
    this.saveBackground();
  }

  get backgroundColor2()
  {
    return this._backgroundColor2;
  }

  set backgroundColor2(color)
  {
    this._backgroundColor2 = color;
    this.updateBackground();
    this.saveBackground();
  }

  get panelOpacity()
  {
    if (this._panelOpacity === null)
    {
      let opacityValue = window.localStorage.getItem("bimrocket.panelOpacity");
      this._panelOpacity = opacityValue ? parseFloat(opacityValue) : 0.8;
    }
    return this._panelOpacity;
  }

  set panelOpacity(opacity)
  {
    this._panelOpacity = opacity;
    window.localStorage.setItem("bimrocket.panelOpacity", String(opacity));
    let panels = this.panelManager.getPanels();
    for (let panel of panels)
    {
      panel.opacity = opacity;
    }
  }

  get frameRateDivisor()
  {
    if (this._frameRateDivisor === null)
    {
      let value = window.localStorage.getItem("bimrocket.frameRateDivisor");
      this._frameRateDivisor = value ? parseInt(value) : 1;
    }
    return this._frameRateDivisor;
  }

  set frameRateDivisor(frd)
  {
    this._frameRateDivisor = frd;
    window.localStorage.setItem("bimrocket.frameRateDivisor", String(frd));
  }

  get showDeepSelection()
  {
    if (this._showDeepSelection === null)
    {
      this._showDeepSelection = window.localStorage.getItem(
        "bimrocket.showDeepSelection") !== "false";
    }
    return this._showDeepSelection;
  }

  set showDeepSelection(enabled)
  {
    this._showDeepSelection = enabled;
    window.localStorage.setItem("bimrocket.showDeepSelection", enabled);
    this.updateSelection();
  }

  get showLocalAxes()
  {
    if (this._showLocalAxes === null)
    {
      this._showLocalAxes = window.localStorage.getItem(
       "bimrocket.showLocalAxes") !== "false";
    }
    return this._showLocalAxes;
  }

  set showLocalAxes(enabled)
  {
    this._showLocalAxes = enabled;
    window.localStorage.setItem("bimrocket.showLocalAxes", enabled);
    this.updateSelection();
  }

  get shadowsEnabled()
  {
    if (this._shadowsEnabled === null)
    {
      this._shadowsEnabled = window.localStorage.getItem(
        "bimrocket.shadowsEnabled") === "true";
    }
    return this._shadowsEnabled;
  }

  set shadowsEnabled(enabled)
  {
    this._shadowsEnabled = enabled;
    window.localStorage.setItem("bimrocket.shadowsEnabled", enabled);

    if (this.renderer.shadowMap)
    {
      if (this.renderer.shadowMap.enabled !== enabled)
      {
        this.renderer.shadowMap.enabled = enabled;
        this.scene.traverse(object =>
        { if (object.material) object.material.needsUpdate = true; });
        this.repaint();
      }
    }
  }

  updateBackground()
  {
    if (this._backgroundColor1 === this._backgroundColor2)
    {
      this.container.style.background = this._backgroundColor1;
    }
    else
    {
      this.container.style.background = "linear-gradient(" +
        this._backgroundColor1 + "," + this._backgroundColor2 + ")";
    }
  }

  restoreBackground()
  {
    this._backgroundColor1 =
      window.localStorage.getItem("bimrocket.backgroundColor1");
    if (this._backgroundColor1 === null)
      this._backgroundColor1 = "#E0E0FF";

    this._backgroundColor2 =
      window.localStorage.getItem("bimrocket.backgroundColor2");
    if (this._backgroundColor2 === null)
      this._backgroundColor2 = "#E0F0E0";
  }

  saveBackground()
  {
    window.localStorage.setItem("bimrocket.backgroundColor1",
      this._backgroundColor1);
    window.localStorage.setItem("bimrocket.backgroundColor2",
      this._backgroundColor2);
  }

  updateSelection()
  {
    this.hideSelectionLines();
    this.showSelectionLines();

    this.hideAxisLines();
    if (this.showLocalAxes)
    {
      this.showAxisLines();
    }
  }

  hideSelectionLines()
  {
    if (this._selectionLines !== null)
    {
      this.overlays.remove(this._selectionLines);
      ObjectUtils.dispose(this._selectionLines);
      this._selectionLines = null;
      this.repaint();
    }
  }

  showSelectionLines()
  {
    if (this._selectionLines === null && !this.selection.isEmpty())
    {
      const linesGroup = new THREE.Group();
      linesGroup.renderOrder = 1;
      linesGroup.name = "SelectionLines";
      const iterator = this.selection.iterator;
      let item = iterator.next();
      while (!item.done)
      {
        let object = item.value;
        this.collectLines(object, linesGroup);
        item = iterator.next();
      }
      this._selectionLines = linesGroup;
      this.overlays.add(this._selectionLines);
      this.repaint();
    }
  }

  transformSelectionLines(matrix)
  {
    if (this._selectionLines !== null)
    {
      const lines = this._selectionLines;
      matrix.decompose(lines.position, lines.quaternion, lines.scale);
      lines.updateMatrix();
      this.repaint();
    }
  }

  collectLines(object, linesGroup)
  {
    let material = this.getSelectionMaterial(object);

    if (object instanceof Solid)
    {
      let solid = object;

      if (this.selectionPaintMode === Application.EDGES_SELECTION)
      {
        let edgesGeometry = solid.edgesGeometry;
        if (edgesGeometry)
        {
          let lines = new THREE.LineSegments(edgesGeometry, material);

          lines.name = "SelectionLines";
          lines.raycast = function(){};

          solid.updateMatrixWorld();
          solid.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
      else // show faces (triangles)
      {
        let geometry = solid.geometry;
        if (geometry)
        {
          let edgesGeometry = geometry.getTrianglesGeometry();

          let lines = new THREE.LineSegments(edgesGeometry, material);
          lines.name = "SelectionLines";
          lines.raycast = function(){};

          solid.updateMatrixWorld();
          solid.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
    }
    else if (object instanceof THREE.Camera)
    {
      let camera = object;
      if (camera !== this.camera)
      {
        camera.updateMatrixWorld();
        let lines = new THREE.CameraHelper(camera);
        lines.updateMatrix();

        lines.name = "SelectionLines";
        lines.raycast = function(){};
        linesGroup.add(lines);
      }
    }
    else if (object instanceof THREE.DirectionalLight)
    {
      let light = object;
      let lines = new THREE.DirectionalLightHelper(light, 1, 0x0);
      lines.name = "SelectionLines";
      lines.raycast = function(){};
      lines.lightPlane.updateMatrix();
      lines.targetLine.updateMatrix();

      linesGroup.add(lines);
    }
    else if (object instanceof THREE.Mesh)
    {
      object.updateMatrixWorld();
      let edgesGeometry = new THREE.EdgesGeometry(object.geometry);

      let lines = new THREE.LineSegments(edgesGeometry, material);
      lines.raycast = function(){};
      lines.name = "OuterLines";
      object.matrixWorld.decompose(
        lines.position, lines.rotation, lines.scale);
      lines.updateMatrix();
      linesGroup.add(lines);
    }
    else if (object instanceof Cord)
    {
      object.updateMatrixWorld();

      let lines = new THREE.LineSegments(object.geometry, material);
      lines.raycast = function(){};
      lines.name = "Lines";
      object.matrixWorld.decompose(
        lines.position, lines.rotation, lines.scale);
      lines.updateMatrix();
      linesGroup.add(lines);
    }
    else if (object instanceof Profile)
    {
      object.updateMatrixWorld();

      let lines = new THREE.LineSegments(object.geometry, material);
      lines.raycast = function(){};
      lines.name = "Lines";
      object.matrixWorld.decompose(
        lines.position, lines.rotation, lines.scale);
      lines.updateMatrix();
      linesGroup.add(lines);
    }
    else if (object instanceof THREE.Group || object instanceof THREE.Object3D)
    {
      object.updateMatrixWorld();

      let selectionProperties = object.userData.selection;
      let selectionType = selectionProperties && selectionProperties.type ?
        selectionProperties.type : "edges";

      if (selectionType === "edges")
      {
        let children = object.children;
        for (let i = 0; i < children.length; i++)
        {
          var child = children[i];
          this.collectLines(child, linesGroup);
        }
      }
      else if (selectionType === "box")
      {
        let box = ObjectUtils.getLocalBoundingBox(object, true);
        if (!box.isEmpty())
        {
          let geometry = ObjectUtils.getBoxGeometry(box);

          let lines = new THREE.LineSegments(geometry, object.visible ?
            this.boxSelectionMaterial : material);
          lines.raycast = function(){};

          object.updateMatrixWorld();
          object.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
    }
  }

  getSelectionMaterial(object)
  {
    if (object.visible)
    {
      return this.showDeepSelection ?
        this.deepSelectionMaterial : this.selectionMaterial;
    }
    else
    {
      return this.showDeepSelection ?
        this.deepInvisibleSelectionMaterial : this.invisibleSelectionMaterial;
    }
  }

  hideAxisLines()
  {
    if (this._axisLines !== null)
    {
      this.overlays.remove(this._axisLines);
      ObjectUtils.dispose(this._axisLines);
      this._axisLines = null;
      this.repaint();
    }
  }

  showAxisLines()
  {
    if (this._axisLines === null)
    {
      var object = this.selection.object;
      if (object)
      {
        this._axisLines = new THREE.AxesHelper(1);

        var lines = this._axisLines;
        lines.name = "AxisLines";
        object.updateMatrixWorld(true);
        object.matrixWorld.decompose(
          lines.position, lines.rotation, lines.scale);
        lines.updateMatrix();
        lines.raycast = function(){};
        lines.material.depthTest = false;
        lines.material.depthWrite = false;

        this.overlays.add(lines);
        this.repaint();
      }
    }
  }

  addEventListener(type, eventListener)
  {
    var eventListeners = this._eventListeners[type];
    if (eventListeners)
    {
      eventListeners.push(eventListener);
    }
  }

  removeEventListener(type, eventListener)
  {
    var eventListeners = this._eventListeners[type];
    if (eventListeners)
    {
      var index = eventListeners.indexOf(eventListener);
      if (index !== -1)
      {
        eventListeners.splice(index, 1);
      }
    }
  }

  notifyEventListeners(type, event)
  {
    const eventListeners = this._eventListeners[type];
    for (let listener of eventListeners)
    {
      listener(event);
    }
  }

  addService(service, group, save = true)
  {
    if (group === undefined)
    {
      console.warn("group is mandatory.");
      return;
    }

    if (this.services[group] === undefined)
    {
      this.services[group] = {};
    }
    this.services[group][service.name] = service;
    if (save) this.saveServices(group);
  }

  removeService(service, group, save = true)
  {
    if (this.services[group])
    {
      delete this.services[group][service.name];
      if (save) this.saveServices(group);
    }
  }

  saveServices(group)
  {
    let data = [];
    let serviceGroup = this.services[group];
    for (let name in serviceGroup)
    {
      let service = serviceGroup[name];
      data.push(
      {
        className : service.constructor.name,
        parameters: service.getParameters()
      });
    }
    let json = JSON.stringify(data);
    window.localStorage.setItem("bimrocket.services." + group, json);
    console.info("save services." + group + ": ", data);
  }

  restoreServices(group)
  {
    let json = window.localStorage.getItem("bimrocket.services." + group);
    if (json)
    {
      let array = JSON.parse(json);
      for (let i = 0; i < array.length; i++)
      {
        let entry = array[i];
        let className = entry.className;
        let parameters = entry.parameters;
        let serviceClass = ServiceManager.classes[className];
        if (serviceClass)
        {
          let service = new serviceClass();
          service.setParameters(parameters);
          this.addService(service, group, false);
        }
        else console.warn("Service " + className + " not restored.");
      }
    }
  }

  addTool(tool)
  {
    if (!this.tools[tool.name])
    {
      this.tools[tool.name] = tool;

      var toolEvent = {type : "added", tool : tool};
      this.notifyEventListeners("tool", toolEvent);
    }
  }

  removeTool(tool)
  {
    if (this.tool === tool) return;

    if (this.tools[tool.name])
    {
      delete this.tools[tool.name];

      var toolEvent = {type : "removed", tool : tool};
      this.notifyEventListeners("tool", toolEvent);
    }
  }

  useTool(tool)
  {
    if (typeof tool === "string")
    {
      tool = this.tools[tool];
    }

    if (tool === undefined) tool = null;

    let toolEvent;
    if (tool && tool.immediate)
    {
      tool.execute();
      toolEvent = {type : "executed", tool : tool};
      this.notifyEventListeners("tool", toolEvent);
    }
    else
    {
      if (this.tool === tool) return; // already active

      if (this.tool !== null)
      {
        this.tool.deactivate();
        toolEvent = {type : "deactivated", tool : this.tool};
        this.notifyEventListeners("tool", toolEvent);
      }
      this.tool = tool;
      if (tool)
      {
        tool.activate();
        toolEvent = {type: "activated", tool: tool};
        this.notifyEventListeners("tool", toolEvent);
      }
    }
  }

  addObject(object, parent = null,
    attach = false, select = false, source = this)
  {
    if (!(object instanceof THREE.Object3D)) return;

    if (parent === null)
    {
      parent = this.selection.object || this.baseObject;
      const scene = this.scene;
      while (parent !== scene)
      {
        if (parent.type === "Object3D"
            || parent.type === "Group"
            || (parent.type === "Solid" && object.type === "Profile")
            || (parent.type === "Solid" && object.type === "Cord"))
        {
          break;
        }
        else
        {
          parent = parent.parent;
        }
      }
    }
    if (attach)
    {
      parent.attach(object);
    }
    else
    {
      parent.add(object);
    }
    object.updateMatrix();

    let addEvent =
    {
      type : "added",
      object : object,
      parent: parent,
      source : source
    };
    this.notifyEventListeners("scene", addEvent);

    if (select)
    {
      this.selection.set(object);
    }
    return object;
  }

  removeObject(object, source = this)
  {
    if (!(object instanceof THREE.Object3D))
    {
      object = this.selection.object;
    }
    if (object && object !== this.baseObject && object !== this.scene)
    {
      this.stopControllers(object);

      let parent = object.parent;
      if (parent)
      {
        parent.remove(object);
        ObjectUtils.dispose(object);
      }
      let removeEvent =
      {
        type : "removed",
        object : object,
        parent : parent,
        source : source
      };
      this.notifyEventListeners("scene", removeEvent);

      this.selection.remove(object); // TODO: unselect child objects
    }
  }

  cloneObject(object, dynamic = false)
  {
    if (object === undefined)
    {
      object = this.selection.object;
    }
    if (object && object !== this.baseObject)
    {
      let clone;
      if (dynamic)
      {
        clone = new THREE.Object3D();
        clone.name = object.name + "_cloner";
        clone.builder = new Cloner(object);
        ObjectBuilder.build(clone);
      }
      else
      {
        clone = object.clone(true);
        clone.name = object.name + "_clone";
      }
      this.addObject(clone, object.parent);
    }
  }

  cutObjects()
  {
    let cutObjects = this.selection.roots;
    cutObjects = cutObjects.filter(
      root => root !== this.scene && root.parent !== this.scene);
    this._cutObjects = cutObjects;
    if (cutObjects.length > 0)
    {
      let cutEvent =
      {
        type : "cut",
        objects : cutObjects,
        source : this
      };
      this.notifyEventListeners("scene", cutEvent);
    }
  }

  pasteObjects(parent)
  {
    let cutObjects = this._cutObjects;
    if (cutObjects.length > 0)
    {
      if (parent === undefined)
      {
        parent = this.selection.object;
      }
      if (parent instanceof THREE.Object3D)
      {
        let object = parent;
        while (object &&
               object !== this.baseObject &&
               cutObjects.indexOf(object) === -1)
        {
          object = object.parent;
        }
        if (object === this.baseObject) // paste only under baseObject
        {
          for (let cutObject of cutObjects)
          {
            let removeEvent =
            {
              type : "removed",
              object : cutObject,
              parent : cutObject.parent,
              source : this
            };
            let addEvent =
            {
              type : "added",
              object : cutObject,
              parent : parent,
              source : this
            };
            parent.attach(cutObject);
            cutObject.updateMatrix();
            cutObject.updateMatrixWorld();
            this.notifyEventListeners("scene", removeEvent);
            this.notifyEventListeners("scene", addEvent);
          }
          let pasteEvent =
          {
            type: "pasted",
            objects: cutObjects,
            source : this
          };
          this.notifyEventListeners("scene", pasteEvent);
          this._cutObjects = [];
        }
      }
      this.selection.set(parent);
    }
  }

  notifyObjectsChanged(objects, source = this, type = "nodeChanged",
    properties = null) // properties: array of property names or null
  {
    if (objects instanceof THREE.Object3D)
    {
      objects = [objects];
    }

    let sceneEvent =
    {
      type: type,
      source : source,
      objects: objects,
      properties: properties
    };
    this.notifyEventListeners("scene", sceneEvent);
  }

  selectParentObject()
  {
    if (!this.selection.isEmpty())
    {
      let parent = this.selection.object.parent;
      if (parent)
      {
        this.selection.set(parent);
      }
    }
  }

  findObjects(objectExpression, baseObject = this.baseObject, nested = false)
  {
    let objects;

    if (objectExpression === null)
    {
      objects = this.selection.roots;
    }
    else if (objectExpression instanceof THREE.Object3D)
    {
      objects = [objectExpression];
    }
    else if (objectExpression instanceof Array)
    {
      // assume objectExpression is an Object3D array
      objects = objectExpression;
    }
    else if (typeof objectExpression === "string"
            || typeof objectExpression === "function")
    {
      const condition = ObjectUtils.createEvalFunction(objectExpression);
      objects = ObjectUtils.findObjects(condition, baseObject, nested);
    }
    else
    {
      objects = [];
    }

    return objects;
  }

  selectObjects(objectExpression, selectionMode)
  {
    const objects = this.findObjects(objectExpression);
    const selection = this.selection;

    if (selectionMode === Application.ADD_SELECTION_MODE)
    {
      selection.add(...objects);
    }
    else if (selectionMode === Application.REMOVE_SELECTION_MODE)
    {
      selection.remove(...objects);
    }
    else
    {
      selection.set(...objects);
    }
  }

  updateVisibility(objectExpression, visible)
  {
    let objects = this.findObjects(objectExpression);

    const changed = ObjectUtils.updateVisibility(objects, visible);

    this.notifyObjectsChanged(Array.from(changed));

    return changed;
  }

  updateStyle(objectExpression, edgesVisible, facesVisible)
  {
    let objects = this.findObjects(objectExpression);

    const changed = ObjectUtils.updateStyle(
      objects, edgesVisible, facesVisible);

    this.notifyObjectsChanged(Array.from(changed));

    return changed;
  }

  updateAppearance(objectExpression, appearance)
  {
    let objects = this.findObjects(objectExpression);

    const changed = ObjectUtils.updateAppearance(objects, appearance);

    this.notifyObjectsChanged(Array.from(changed));

    return changed;
  }

  updateObjects(objectExpression, updateFunction, recursive = false)
  {
    let objects = this.findObjects(objectExpression);

    const changed = ObjectUtils.updateObjects(
      objects, updateFunction, recursive);

    this.notifyObjectsChanged(Array.from(changed));

    return changed;
  }

  userSelectObjects(objects, event)
  {
    event.preventDefault();

    const selection = this.selection;
    if (event.shiftKey)
    {
      selection.add(...objects);
    }
    else if (event.ctrlKey)
    {
      selection.remove(...objects);
    }
    else
    {
      if (this.selectionMode === Application.ADD_SELECTION_MODE)
      {
        selection.add(...objects);
      }
      else if (this.selectionMode === Application.REMOVE_SELECTION_MODE)
      {
        selection.remove(...objects);
      }
      else
      {
        selection.set(...objects);
      }
    }
  }

  initControllers(object)
  {
    this.handleControllers(controller => controller.init(this), object);
  }

  startControllers(object)
  {
    const set = new Set();
    this.handleControllers(controller =>
    { controller.start(); set.add(controller.object); }, object);
    const objects = Array.from(set);
    this.notifyObjectsChanged(objects, this);
  }

  stopControllers(object)
  {
    const set = new Set();
    this.handleControllers(controller =>
    { controller.stop(); set.add(controller.object); }, object);
    const objects = Array.from(set);
    this.notifyObjectsChanged(objects, this);
  }

  handleControllers(handler, object)
  {
    if (object === undefined) object = this.scene;

    object.traverse(obj =>
    {
      let objectControllers = obj.controllers;
      if (objectControllers)
      {
        for (let name in objectControllers)
        {
          let controller = objectControllers[name];
          handler(controller);
        }
      }
    });
  }

  createController(controllerClass = null, object = null, name = null)
  {
    if (controllerClass === null) return;

    if (object === null)
    {
      object = this.baseObject;
    }
    if (name === null || name.trim().length === 0)
    {
      let count = object.controllers ?
        Object.keys(object.controllers).length : 0;
      name = "ctr_" + count;
    }
    let controller = new controllerClass(object, name);
    if (object.controllers === undefined)
    {
      object.controllers = {};
    }
    object.controllers[name] = controller;

    controller.init(this);

    this.notifyObjectsChanged(object);

    return controller;
  }

  evaluateFormulas()
  {
    const updatedObjects = Formula.updateTree(this.scene);

    console.info("Objects updated by formulas", updatedObjects);

    if (updatedObjects.length > 0)
    {
      this.notifyObjectsChanged(updatedObjects);
    }
  }

  rebuild()
  {
    const baseObject = this.baseObject;

    const built = [];
    ObjectBuilder.markAndBuild(baseObject, built);
    console.info("Objects rebuilt", built);

    if (built.length > 0)
    {
      let sceneEvent = {type: "structureChanged", objects: built,
        source : ObjectBuilder};
      this.notifyEventListeners("scene", sceneEvent);

      this.updateSelection();
    }
  }

  updateCameraAspectRatio()
  {
    var camera = this.camera;
    var container = this.container;
    var aspect = container.clientWidth / container.clientHeight;
    ObjectUtils.updateCameraAspectRatio(camera, aspect);
  }

  activateCamera(camera)
  {
    this.camera = camera;
    this.updateCameraAspectRatio();

    const changeEvent = {type: "cameraActivated", object: camera,
      source : this};
    this.notifyEventListeners("scene", changeEvent);
  }

  onResize()
  {
    this.updateCameraAspectRatio();
    const container = this.container;
    const renderer = this.renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    this.repaint();
  }

  createPanel(title, position, className)
  {
    const panel = new Panel(this);

    if (title) panel.title = title;
    if (position) panel.position = position;
    if (className) panel.setClassName(className);

    this.panelManager.addPanel(panel);

    return panel;
  }

  loadModules(...modulePaths)
  {
    const pendent = [];

    const loadNextModule = () =>
    {
      if (pendent.length > 0)
      {
        let modulePath = pendent.pop();
        ModuleLoader.load(modulePath).then(
          module =>
          {
            console.info("module " + modulePath + " completed.");
            module.load(this);
          },
          error =>
          {
            console.info(`module " + modulePath + " failed: ${error}`);
          }).finally(() => loadNextModule());
      }
      else
      {
        setTimeout(() => { this.hideLogo(); this.loadModelFromUrl(); }, 1000);
      };
    };

    for (let i = modulePaths.length - 1; i >= 0; i--)
    {
      pendent.push(modulePaths[i]);
    }
    loadNextModule();
  }

  showLogo()
  {
    this.logoPanel.classList.add("visible");
    this.logoPanel.classList.remove("hidden");
  }

  hideLogo()
  {
    this.logoPanel.classList.add("hidden");
    this.logoPanel.classList.remove("visible");
  }

  fullscreen()
  {
    if (document.body.requestFullscreen)
    {
      // chrome & firefox
      document.body.requestFullscreen();
    }
    else if (document.body.webkitRequestFullscreen)
    {
      // safari
      document.body.webkitRequestFullscreen();
    }
  }

  loadModelFromUrl()
  {
    const params = WebUtils.getQueryParams();

    const url = params["url"];
    if (url === undefined) return;

    const application = this;
    const intent =
    {
      url : url,
      onProgress : data =>
      {
        application.progressBar.progress = data.progress;
        application.progressBar.message = data.message;
      },
      onCompleted : object =>
      {
        application.addObject(object);
        application.progressBar.visible = false;
        application.initTasks(params);
      },
      onError : error =>
      {
        application.progressBar.visible = false;
        MessageDialog.create("ERROR", error)
          .setClassName("error")
          .setI18N(application.i18n).show();
      },
      options : { units : application.units }
    };
    application.progressBar.message = "Loading file...";
    application.progressBar.progress = undefined;
    application.progressBar.visible = true;

    const auth = params["auth"];
    if (auth === "Basic")
    {
      let dialog = new LoginDialog(application);
      dialog.login = (username, password) =>
      {
        intent.basicAuthCredentials =
        { "username" : username, "password" : password };
        IOManager.load(intent);
      };
      dialog.onCancel = () =>
      {
        dialog.hide();
        application.progressBar.visible = false;
      };
      dialog.show();
    }
    else
    {
      IOManager.load(intent); // async load
    }
  }

  initTasks(params)
  {
    const toolName = params["tool"];
    if (toolName)
    {
      let tool = this.tools[toolName];
      if (tool)
      {
        this.useTool(tool);
      }
    }
    else
    {
      const scriptPath = params["script"];
      if (scriptPath)
      {
        const request = new XMLHttpRequest();
        request.open('GET', scriptPath, true);
        request.onload = () =>
        {
          console.info(request.status);
          if (request.status === 200)
          {
            const scriptCode = request.responseText;
            const dialog = new ScriptDialog(this);
            dialog.scriptName = "init_script";
            dialog.scriptCode = scriptCode;
            let error = dialog.run();
            if (error)
            {
              dialog.show();
            }
          }
          else
          {
            let message = WebUtils.getHttpStatusMessage(request.status);
            MessageDialog.create("ERROR", "Can't open script: " + message +
              " (HTTP " + request.status + ")")
              .setClassName("error")
              .setI18N(this.i18n).show();
          }
        };
        request.send();
      }
    }
  }
}

export { Application };


