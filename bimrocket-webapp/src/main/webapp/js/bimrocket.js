/**
 * @author realor
 */

BIMROCKET = {
  VERSION : 1,
  HIDDEN_PREFIX : ".",
  controllers : []
};

BIMROCKET.Application = class
{
  static EDGES_SELECTION = "edges";
  static FACES_SELECTION = "faces";
  
  constructor()
  {
    this.scene = null;
    this.camera = null;
    this.baseObject = null;
    this.clippingPlane = null;
    this.clippingGroup = null;
    this.overlays = null;
    this.tools = {};
    this.tool = null;

    /* IO services */
    this.services = []; /* BIMROCKET.IOService */

    /* selection */
    this.selection = new BIMROCKET.Selection(this);
    this.selectionPaintMode = BIMROCKET.Application.EDGES_SELECTION;
    this.showHiddenSelection = false;
    
    this.clock = new THREE.Clock();
    
    this.autoRepaint = false;
    this.needsRepaint = true;
    this.frameRateDivisor = 1;
    
    /* internal properties */
    this._cutObjects = [];
    this._eventListeners = {
      scene : [],
      selection : [],
      animation : [],
      tool : []
    };
    this._selectionLines = null;
    this._axisLines = null;

    let application = this;
    
   	THREE.Object3D.DefaultMatrixAutoUpdate = false;
   	THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

    this.container = document.getElementById('container');
    var container = this.container;

    // renderer
    if (Detector.webgl)
    {
      this.renderer = new THREE.WebGLRenderer({antialias: true, alpha:true});
    }
    else
    {
      this.renderer = new THREE.CanvasRenderer({antialias: true});
    }
    let renderer = this.renderer;
    renderer.setClearColor(new THREE.Color(0xC0C8FF));
    renderer.sortObjects = false;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    /* materials */
    this.selectionMaterial = new THREE.LineBasicMaterial(
      {color: 0x0000ff, linewidth: 1.5, depthTest: true, depthWrite: true,
       polygonOffset: true, polygonOffsetFactor: 2});
    this.hiddenSelectionMaterial = new THREE.LineBasicMaterial(
      {color: 0x0000ff, linewidth: 1, depthTest: false, depthWrite: false});
    this.boxSelectionMaterial = new THREE.LineBasicMaterial(
      {color: 0x0000ff, linewidth: 1.5, depthTest: true, depthWrite: true,
       polygonOffset: true, polygonOffsetFactor: 2});

    /* panels */
    this.panelManager = new BIMROCKET.PanelManager(container);

    var headerElem = document.getElementById("header");
    var toolBarElem = document.getElementById("toolbar");
    var progressBarElem = document.getElementById("progress_bar");

    // general tabbed panel
    this.progressBar = new BIMROCKET.ProgressBar(progressBarElem);

    // tools
    const newSceneTool = new BIMROCKET.NewSceneTool(this);
    const openCloudTool = new BIMROCKET.OpenCloudTool(this);
    const saveCloudTool = new BIMROCKET.SaveCloudTool(this);
    const openLocalTool = new BIMROCKET.OpenLocalTool(this);
    const saveLocalTool = new BIMROCKET.SaveLocalTool(this);
    const optionsTool = new BIMROCKET.OptionsTool(this);
    const printTool = new BIMROCKET.PrintTool(this);
    const selectTool = new BIMROCKET.SelectTool(this);
    const orbitTool = new BIMROCKET.OrbitTool(this);
    const flyTool = new BIMROCKET.FlyTool(this);
    const autoOrbitTool = new BIMROCKET.AutoOrbitTool(this);
    const sectionTool = new BIMROCKET.SectionTool(this);
    const inspectGeometryTool = new BIMROCKET.InspectGeometryTool(this);
    const resetMatrixTool = new BIMROCKET.ResetMatrixTool(this);
    const moveTool = new BIMROCKET.MoveTool(this);
    const rotateTool = new BIMROCKET.RotateTool(this);
    const scaleTool = new BIMROCKET.ScaleTool(this);
    const unionTool = new BIMROCKET.BooleanOperationTool(this,
      {operation: "union", label : "tool.union.label"});
    const intersectionTool = new BIMROCKET.BooleanOperationTool(this,
      {operation: "intersect", label : "tool.intersection.label"});
    const subtractionTool = new BIMROCKET.BooleanOperationTool(this,
      {operation: "subtract", label : "tool.subtraction.label"});
    const clipTool = new BIMROCKET.ClipTool(this);
    const makeSolidTool = new BIMROCKET.MakeSolidTool(this);
    const measureDistanceTool = new BIMROCKET.MeasureDistanceTool(this);
    const activateCameraTool = new BIMROCKET.ActivateCameraTool(this);
    const addGroupTool = new BIMROCKET.AddObjectTool(this,
      {objectType: "group", label : "tool.add_group.label"});
    const addBoxTool = new BIMROCKET.AddObjectTool(this,
      {"objectType": "box", label : "tool.add_box.label"});
    const addCylinderTool = new BIMROCKET.AddObjectTool(this,
      {"objectType": "cylinder", label : "tool.add_cylinder.label"});
    const addSphereTool = new BIMROCKET.AddObjectTool(this,
      {"objectType": "sphere", label : "tool.add_sphere.label"});
    const removeTool = new BIMROCKET.RemoveTool(this);
    const cloneTool = new BIMROCKET.CloneTool(this);
    const cutTool = new BIMROCKET.CutTool(this);
    const pasteTool = new BIMROCKET.PasteTool(this);
    const zoomAllTool = new BIMROCKET.ZoomAllTool(this);
    const centerSelectionTool = new BIMROCKET.CenterSelectionTool(this);
    const focusSelectionTool = new BIMROCKET.CenterSelectionTool(this,
      {name : "focus_selection", label : "tool.focus_selection.label",
       focusOnSelection : true, className : "focus_selection"});
    const showTool = new BIMROCKET.VisibilityTool(this,
      {name : "show", label : "tool.show.label", className : "show"});
    const hideTool = new BIMROCKET.VisibilityTool(this,
      {name : "hide", label : "tool.hide.label",
       edgesVisible : false, facesVisible : false, className : "hide"});
    const showFacesTool = new BIMROCKET.VisibilityTool(this,
      {name : "show_faces", label : "tool.show_faces.label",
       edgesVisible : false});
    const showEdgesTool = new BIMROCKET.VisibilityTool(this,
      {name : "show_edges", label : "tool.show_edges.label",
       facesVisible : false});
    const bimLayersTool = new BIMROCKET.BIMLayersTool(this);
    const bimLayoutTool = new BIMROCKET.BIMLayoutTool(this);
    const bimDataTool = new BIMROCKET.BIMDataTool(this);
    const outlinerTool = new BIMROCKET.OutlinerTool(this);
    const inspectorTool = new BIMROCKET.InspectorTool(this);
    const statisticsTool = new BIMROCKET.StatisticsTool(this);
    const createControllerTool = new BIMROCKET.CreateControllerTool(this);
    const startControllersTool = new BIMROCKET.StartControllersTool(this);
    const stopControllersTool = new BIMROCKET.StopControllersTool(this);
    const loadControllersTool = new BIMROCKET.LoadControllersTool(this);
    const saveControllersTool = new BIMROCKET.SaveControllersTool(this);

    this.addTool(newSceneTool);
    this.addTool(openCloudTool);
    this.addTool(saveCloudTool);
    this.addTool(openLocalTool);
    this.addTool(saveLocalTool);
    this.addTool(optionsTool);
    this.addTool(printTool);
    this.addTool(selectTool);
    this.addTool(orbitTool);
    this.addTool(flyTool);
    this.addTool(autoOrbitTool);
    this.addTool(moveTool);
    this.addTool(rotateTool);
    this.addTool(scaleTool);
    this.addTool(unionTool);
    this.addTool(intersectionTool);
    this.addTool(subtractionTool);
    this.addTool(clipTool);
    this.addTool(makeSolidTool);
    this.addTool(sectionTool);
    this.addTool(measureDistanceTool);
    this.addTool(activateCameraTool);
    this.addTool(inspectGeometryTool);
    this.addTool(resetMatrixTool);
    this.addTool(addGroupTool);
    this.addTool(addBoxTool);
    this.addTool(addCylinderTool);
    this.addTool(addSphereTool);
    this.addTool(removeTool);
    this.addTool(cloneTool);
    this.addTool(cutTool);
    this.addTool(pasteTool);
    this.addTool(zoomAllTool);
    this.addTool(centerSelectionTool);
    this.addTool(focusSelectionTool);
    this.addTool(showTool);
    this.addTool(hideTool);
    this.addTool(showFacesTool);
    this.addTool(showEdgesTool);
    this.addTool(bimLayersTool);
    this.addTool(bimLayoutTool);
    this.addTool(bimDataTool);
    this.addTool(outlinerTool);
    this.addTool(inspectorTool);
    this.addTool(statisticsTool);
    this.addTool(startControllersTool);
    this.addTool(stopControllersTool);
    this.addTool(createControllerTool);
    this.addTool(loadControllersTool);
    this.addTool(saveControllersTool);

    // menuBar
    const menuBar = new BIMROCKET.MenuBar(this, headerElem);
    this.menuBar = menuBar;

    const fileMenu = menuBar.addMenu("File");
    fileMenu.addMenuItem(newSceneTool);
    fileMenu.addMenuItem(openCloudTool);
    fileMenu.addMenuItem(openLocalTool);
    fileMenu.addMenuItem(saveCloudTool);
    fileMenu.addMenuItem(saveLocalTool);
    fileMenu.addMenuItem(printTool);

    const editMenu = menuBar.addMenu("Edit");
    editMenu.addMenuItem(selectTool);
    editMenu.addMenuItem(cutTool);
    editMenu.addMenuItem(pasteTool);
    editMenu.addMenuItem(removeTool);
    editMenu.addMenuItem(cloneTool);
    editMenu.addMenuItem(optionsTool);

    const viewMenu = menuBar.addMenu("View");
    viewMenu.addMenuItem(orbitTool);
    viewMenu.addMenuItem(flyTool);
    viewMenu.addMenuItem(zoomAllTool);
    viewMenu.addMenuItem(showTool);
    viewMenu.addMenuItem(hideTool);
    viewMenu.addMenuItem(centerSelectionTool);
    viewMenu.addMenuItem(focusSelectionTool);
    viewMenu.addMenuItem(activateCameraTool);
    viewMenu.addMenuItem(sectionTool);

    const designMenu = menuBar.addMenu("Design");
    const addMenu = designMenu.addMenu("Add");
    addMenu.addMenuItem(addBoxTool);
    addMenu.addMenuItem(addCylinderTool);
    addMenu.addMenuItem(addSphereTool);
    addMenu.addMenuItem(addGroupTool);
    const booleanOperationMenu = designMenu.addMenu("Boolean operation");    
    booleanOperationMenu.addMenuItem(unionTool);
    booleanOperationMenu.addMenuItem(intersectionTool);
    booleanOperationMenu.addMenuItem(subtractionTool);
    designMenu.addMenuItem(clipTool);
    designMenu.addMenuItem(makeSolidTool);
    designMenu.addMenuItem(inspectGeometryTool);
    designMenu.addMenuItem(resetMatrixTool);

//    var testMenu = menuBar.addMenu("Test");
//    testMenu.addMenuItem(unionTool);
//    testMenu.addMenuItem(hideTool);
//    var testMenu2 = testMenu.addMenu("Test2");
//    testMenu2.addMenuItem(selectTool);
//    var testMenu3 = testMenu2.addMenu("Test3");
//    testMenu3.addMenuItem(intersectionTool);
//    testMenu3.addMenuItem(selectTool);
//    testMenu3.addMenuItem(orbitTool);
//    testMenu2.addMenuItem(hideTool);
//    testMenu.addMenuItem(hideTool);

    const transformMenu = menuBar.addMenu("Transform");
    transformMenu.addMenuItem(moveTool);
    transformMenu.addMenuItem(rotateTool);
    transformMenu.addMenuItem(scaleTool);

    const measureMenu = menuBar.addMenu("Measure");
    measureMenu.addMenuItem(measureDistanceTool);

    const controlMenu = menuBar.addMenu("Control");
    controlMenu.addMenuItem(createControllerTool);
    controlMenu.addMenuItem(loadControllersTool);
    controlMenu.addMenuItem(saveControllersTool);
    controlMenu.addMenuItem(startControllersTool);
    controlMenu.addMenuItem(stopControllersTool);

    const bimMenu = menuBar.addMenu("BIM");
    bimMenu.addMenuItem(bimLayoutTool);
    bimMenu.addMenuItem(bimLayersTool);
    bimMenu.addMenuItem(bimDataTool);

    const panelsMenu = menuBar.addMenu("Panels");
    panelsMenu.addMenuItem(outlinerTool);
    panelsMenu.addMenuItem(inspectorTool);
    panelsMenu.addMenuItem(statisticsTool);

    // toolBar
    const toolBar = new BIMROCKET.ToolBar(this, toolBarElem);
    this.toolBar = toolBar;

    toolBar.addToolButton(newSceneTool);
    toolBar.addToolButton(openCloudTool);
    toolBar.addToolButton(saveCloudTool);
    toolBar.addToolButton(openLocalTool);
    toolBar.addToolButton(saveLocalTool);
    toolBar.addToolButton(optionsTool);
    toolBar.addToolButton(printTool);
    toolBar.addToolButton(selectTool);
    toolBar.addToolButton(orbitTool);
    toolBar.addToolButton(flyTool);
    toolBar.addToolButton(zoomAllTool);
    toolBar.addToolButton(showTool);
    toolBar.addToolButton(hideTool);
    toolBar.addToolButton(sectionTool);
    toolBar.addToolButton(centerSelectionTool);
    toolBar.addToolButton(focusSelectionTool);
    toolBar.addToolButton(bimLayoutTool);
    toolBar.addToolButton(bimLayersTool);
    toolBar.addToolButton(measureDistanceTool);
    toolBar.addToolButton(moveTool);
    toolBar.addToolButton(rotateTool);
    toolBar.addToolButton(scaleTool);

    // outliner
    this.outliner = new BIMROCKET.Outliner(this);
    this.outliner.visible = true;
    this.panelManager.addPanel(this.outliner);

    // inspector
    this.inspector = new BIMROCKET.Inspector(this);
    this.inspector.visible = true;
    this.panelManager.addPanel(this.inspector);

    // statistics
    this.statistics = new BIMROCKET.Statistics(this);
    this.panelManager.addPanel(this.statistics);

    // Services
    var protocol = location.protocol + "//";
    var host = location.host;
    var svc1 = new BIMROCKET.WebdavService("svc1",
      "Equipaments", protocol + host + "/bimrocket-server/cloudfs/equipaments");
    var svc2 = new BIMROCKET.ComponentService("svc2",
      "Components", protocol + host + "/bimrocket-server/cloudfs/components");
    this.addService(svc1);
    this.addService(svc2);

    // listeners
    window.addEventListener('resize', this.onResize.bind(this), false);

    this.addEventListener("scene", function(event)
    {
      if (event.type === "cameraActivated")
      {
        application.hideSelectionLines();
      }
      else if (event.type !== "cut")
      {
        if (event.type === "nodeChanged")
        {
          if (event.object instanceof THREE.Camera &&
              event.source instanceof BIMROCKET.Inspector)
          {
            // if inspector change a camera
            var camera = event.object;
            camera.updateProjectionMatrix();
          }
          else if (application.selection.contains(event.object))
          {
            application.updateSelection();
          }
        }
        application.repaint();
      }
    });

    this.addEventListener("selection", function(event)
    {
      if (event.type === "changed")
      {
        application.updateSelection();
      }
    });

    var __animationEvent = {delta : 0};
    var __animationCounter = 0;
    var animate = function()
    {
      requestAnimationFrame(animate);

      __animationCounter++;
      if (__animationCounter >= application.frameRateDivisor)
      {
        __animationCounter = 0;
        __animationEvent.delta = application.clock.getDelta();
        if (application._eventListeners.animation.length > 0)
        {
          application.notifyEventListeners('animation', __animationEvent);
        }

        if (application.autoRepaint || application.needsRepaint)
        {
          application.render();
        }
      }
    };

    // use tool
    this.useTool(openCloudTool);

    // init scene
    this.initScene();
    animate();
    
    setTimeout(function() {
      application.hideLogo();
    }, 1000);

    var params = getQueryParams();
    var url = params["url"];
    if (url)
    {
      var intent =
      {
        url : url,
        onProgress : function(data)
        {
          application.progressBar.progress = data.progress;
          application.progressBar.message = data.message;
        },
        onCompleted : function(object)
        {
          application.initScene(object);
          application.progressBar.visible = false;
          var toolName = params["tool"];
          if (toolName)
          {
            var tool = scope.tools[toolName];
            if (tool)
            {
              application.useTool(tool);
            }
          }
        },
        onError : function(error)
        {
          application.progressBar.visible = false;
          var messageDialog = 
            new BIMROCKET.MessageDialog("ERROR", error, "error");
          messageDialog.show();
        }
      };
      application.progressBar.message = "Loading file...";
      application.progressBar.progress = undefined;
      application.progressBar.visible = true;
      BIMROCKET.IOManager.load(intent); // asynchron load
    }
  }

  initScene(object)
  {
    var application = this;
    var container = this.container;

    if (this.scene)
    {
      BIMROCKET.ObjectUtils.dispose(this.scene);
      this.stopControllers();
    }

    this.scene = new THREE.Scene();
    var scene = this.scene;
    scene.name = "Scene";

    // Add lights
    var ambientLight = new THREE.AmbientLight(0x303030);
    ambientLight.name = "AmbientLight";
    ambientLight.updateMatrix();
    scene.add(ambientLight);

    var sunLight = new THREE.DirectionalLight(0xFFFFFF);
    sunLight.position.x = 1000;
    sunLight.position.y = 800;
    sunLight.position.z = 800;
    sunLight.position.normalize();
    sunLight.name = "SunLight";
    sunLight.updateMatrix();
    scene.add(sunLight);

    var sunLight2 = new THREE.DirectionalLight(0xFFFFFF);
    sunLight2.position.x = -1000;
    sunLight2.position.y = -1000;
    sunLight2.position.z = 800;
    sunLight2.position.normalize();
    sunLight2.name = "SunLight2";
    sunLight2.updateMatrix();
    scene.add(sunLight2);

    // initial camera
    camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -100, 100);
    camera.position.set(0, -30, 2);
    camera.name = "Orthografic";
    camera.updateProjectionMatrix();
    camera.updateMatrix();
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.updateMatrix();
    scene.add(camera);

    var camera = new THREE.PerspectiveCamera(60,
      container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.position.set(0, -10, 0.2);
    camera.name = "Perspective";
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    camera.updateMatrix();
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.updateMatrix();
    scene.add(camera);

    this.camera = camera;

    // Add base group
    this.baseObject = new THREE.Group();
    this.baseObject.name = "Base";
    this.baseObject.userData.selection = {type : "none"};
    
    this.baseObject.updateMatrix();

    scene.add(this.baseObject);

//    var boxGeometry = new THREE.BoxGeometry(1, 1, 1);    
//    var boxMaterial = new THREE.MeshPhongMaterial({
//       color : new THREE.Color(0xff0000),
//       flatShading: true,
//       side: THREE.DoubleSide
//    });
//    var box = new THREE.Mesh(boxGeometry, boxMaterial);
//    this.baseObject.add(box);

    // Add initial object
    if (object instanceof THREE.Object3D)
    {
      this.baseObject.add(object);

      var cameras = BIMROCKET.ObjectUtils.findCameras(object);
      if (cameras.length > 0)
      {
        this.camera = cameras[0];
        this.updateCameraAspectRatio();
      }
      else
      {
        application.scene.updateMatrixWorld(true);    
        BIMROCKET.ObjectUtils.zoomAll(this.camera, this.baseObject);
      }
      object.updateMatrix();
    }

    // Add ground

    var groundMaterial = new THREE.MeshPhongMaterial(
      {color: 0x808080, shininess: 1, depthWrite: true});
    groundMaterial.polygonOffset = true;
    groundMaterial.polygonOffsetFactor = 2.0;
    groundMaterial.polygonOffsetUnits = 1.5;

//    var textureLoader = new THREE.TextureLoader();
//    var groundTexture = textureLoader.load("textures/desert.png",
//      function(texture) {
//        application.repaint();
//      });
//    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
//    groundTexture.repeat.set(100, 100);
//    groundMaterial.map = groundTexture;

//    this.ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 1000),
//      groundMaterial);
//    this.ground.name = "GROUND";
//    this.ground.updateMatrix();
//    scene.add(this.ground);

    // Add clipping group
    this.clippingGroup = new THREE.Group();
    this.clippingGroup.name = BIMROCKET.HIDDEN_PREFIX + "clipping";
    this.scene.add(this.clippingGroup);

    // Add overlays group
    this.overlays = new THREE.Group();
    this.overlays.name = BIMROCKET.HIDDEN_PREFIX + "overlays";
    this.overlays.matrixAutoUpdate = false;
    this.scene.add(this.overlays);

    var changeEvent = {type : "structureChanged",
      object : this.scene, parent : null, source : this};
    this.notifyEventListeners("scene", changeEvent);

    this.selection.set(object || application.baseObject);

    this.scene.updateMatrix();
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
  
  updateSelection()
  {
    this.hideSelectionLines();
    this.showSelectionLines();

    this.hideAxisLines();
    this.showAxisLines();    
  }

  hideSelectionLines()
  {
    if (this._selectionLines !== null)
    {
      this.overlays.remove(this._selectionLines);
      this._selectionLines = null;
      this.repaint();
    }
  }

  showSelectionLines()
  {
    if (this._selectionLines === null && !this.selection.isEmpty())
    {
      var linesGroup = new THREE.Group();
      linesGroup.name = "SelectionLines";
      var iterator = this.selection.iterator;
      var item = iterator.next();
      while (!item.done)
      {
        var object = item.value;
        this.collectLines(object, linesGroup);
        item = iterator.next();
      }
      this._selectionLines = linesGroup;
      this.overlays.add(this._selectionLines);
      this.repaint();
    }
  }

  collectLines(object, linesGroup)
  {
    if (object instanceof BIMROCKET.Solid)
    {
      var solid = object;
      if (this.selectionPaintMode === BIMROCKET.Application.EDGES_SELECTION)
      {
        let edgesGeometry = solid.edgesGeometry;
        if (edgesGeometry)
        {
          let lines = new THREE.LineSegments(edgesGeometry, 
            this.showHiddenSelection ? 
              this.hiddenSelectionMaterial : this.selectionMaterial);

          lines.name = "SelectionLines";
          lines.raycast = function(){};

          solid.updateMatrixWorld();
          solid.matrixWorld.decompose(
            lines.position, lines.rotation, lines.scale);
          lines.updateMatrix();
          linesGroup.add(lines);
        }
      }
      else // show faces
      {
        let geometry = solid.geometry;
        if (geometry)
        {
          let edgeMap = new BIMROCKET.EdgeMap(geometry);
          let edgesGeometry = edgeMap.getEdgesGeometry(0);
          
          let lines = new THREE.LineSegments(edgesGeometry,
            this.showHiddenSelection ? 
              this.hiddenSelectionMaterial : this.selectionMaterial);
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
      var camera = object;
      if (camera !== this.camera)
      {
        camera.updateMatrixWorld();
        var lines = new THREE.CameraHelper(camera);
        lines.updateMatrix();

        lines.name = "SelectionLines";
        lines.raycast = function(){};
        linesGroup.add(lines);
      }
    }
    else if (object instanceof THREE.DirectionalLight)
    {
      var light = object;
      light.updateMatrixWorld();
      var lines = new THREE.DirectionalLightHelper(light, 1);

      lines.name = "SelectionLines";
      lines.raycast = function(){};

      linesGroup.add(lines);
    }
    else if (object instanceof THREE.Mesh)
    {
      object.updateMatrixWorld();
      let edgesGeometry = new THREE.EdgesGeometry(object.geometry);

      let lines = new THREE.LineSegments(edgesGeometry,
        this.showHiddenSelection ? 
        this.hiddenSelectionMaterial : this.selectionMaterial);
      lines.raycast = function(){};
      lines.name = "OuterLines";
      object.matrixWorld.decompose(
        lines.position, lines.rotation, lines.scale);
      lines.updateMatrix();
      linesGroup.add(lines);
    }
    else if (object instanceof THREE.Group || object instanceof THREE.Object3D)
    {
      object.updateMatrixWorld();

      var selectionProperties = object.userData.selection;
      var selectionType = selectionProperties && selectionProperties.type ?
        selectionProperties.type : "edges";

      if (selectionType === "edges")
      {
        var children = object.children;
        for (var i = 0; i < children.length; i++)
        {
          var child = children[i];
          this.collectLines(child, linesGroup);
        }
      }
      else if (selectionType === "box")
      {
        var box = BIMROCKET.ObjectUtils.getLocalBoundingBox(object);
        if (!box.isEmpty())
        {
          var geometry = BIMROCKET.ObjectUtils.getBoxGeometry(box);

          var lines = new THREE.LineSegments(geometry,
            this.boxSelectionMaterial);
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

  hideAxisLines()
  {
    if (this._axisLines !== null)
    {
      this.overlays.remove(this._axisLines);
      BIMROCKET.ObjectUtils.dispose(this._axisLines);
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
    var eventListeners = this._eventListeners[type];
    for (var i = 0; i < eventListeners.length; i++)
    {
      var listener = eventListeners[i];
      listener(event);
    }
  }

  addService(service)
  {
    this.services[service.name] = service;
  }

  removeService(service)
  {
    delete this.services[service.name];
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
    
    var toolEvent;
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

  addObject(object, parent, attach)
  {
    if (!(object instanceof THREE.Object3D)) return;

    if (!(parent instanceof THREE.Object3D))
    {
      parent = this.selection.object || this.baseObject;
      while (parent instanceof THREE.Mesh || parent instanceof BIMROCKET.Solid)
      {
        parent = parent.parent;
      }
    }
    if (attach)
    {
      parent.attach(object);
      object.updateMatrix();
    }
    else
    {
      parent.add(object);
    }

    let addEvent = {type : "added", object : object, parent: parent,
      source : this};
    this.notifyEventListeners("scene", addEvent);

    this.selection.set(object);

    return object;
  }

  removeObject(object)
  {
    if (!(object instanceof THREE.Object3D))
    {
      object = this.selection.object;
    }
    if (object && object !== this.baseObject && object !== this.scene)
    {
      let parent = object.parent;
      if (parent)
      {
        parent.remove(object);
      }      
      let removeEvent = {type : "removed", object : object, parent : parent,
        source : this};
      this.notifyEventListeners("scene", removeEvent);

      this.selection.remove(object);      
    }
  }

  cloneObject(object)
  {
    if (object === undefined)
    {
      object = this.selection.object;
    }
    if (object && object !== this.baseObject)
    {
      let clone = object.clone(undefined, true);
      clone.name = clone.name + "_clone";
      this.addObject(clone, object.parent);
    }
  }

  cutObjects()
  {
    let cutObjects = this.selection.objects;
    this._cutObjects = cutObjects;
    if (cutObjects.length > 0)
    {
      let cutEvent = {type : "cut", objects : cutObjects, source : this};
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
          for (let i = 0; i < cutObjects.length; i++)
          {
            let cutObject = cutObjects[i];
            let removeEvent = {type : "removed", object : cutObject,
              parent : cutObject.parent, source : this};
            let addEvent = {type : "added", object : cutObject,
              parent : parent, source : this};
            parent.attach(cutObject);
            cutObject.updateMatrix();
            cutObject.updateMatrixWorld();
            this.notifyEventListeners("scene", removeEvent);
            this.notifyEventListeners("scene", addEvent);
          }
          let pasteEvent = {type: "pasted", objects: cutObjects, source : this};
          this.notifyEventListeners("scene", pasteEvent);
          this._cutObjects = [];
        }
      }
      this.selection.set(parent);
    }
  }

  notifyObjectUpdated(object)
  {
    let sceneEvent = {type: "nodeChanged", object: object,
      source : this};
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

  updateVisibility(objects, edgesVisible, facesVisible, recursive)
  {
    if (objects === null)
    {
      objects = this.selection.objects;
    }
    else if (objects instanceof THREE.Object3D)
    {
      objects = [objects];
    }
    
    if (objects.length > 0)
    {
      for (let i = 0; i < objects.length; i++)
      {
        let object = objects[i];
        BIMROCKET.ObjectUtils.updateVisibility(object, 
          edgesVisible, facesVisible, recursive);

        let sceneEvent = {type: "nodeChanged", object: object,
          source : this};
        this.notifyEventListeners("scene", sceneEvent);
      }
    }
  }

  handleControllers(handler, object)
  {
    if (object === undefined) object = this.scene;

    object.traverse(function(object)
    {
      let objectControllers = object.controllers;
      if (objectControllers)
      {
        for (let i = 0; i < objectControllers.length; i++)
        {
          handler(objectControllers[i]);
        }
      }
    });
  }

  createController(controllerClass = null, object = null, 
    name = null, start = false)
  {
    if (controllerClass === null) return;
    
    if (object === null)
    {
      object = this.baseObject;
    }
    let controller = new controllerClass(this, object, name);
    if (object.controllers)
    {
      object.controllers.push(controller);
    }
    else
    {
      object.controllers = [controller];
    }
    
    if (start)
    {
      controller.start();
    }
    
    let sceneEvent = {type: "nodeChanged", object: object,
      source : this};
    this.notifyEventListeners("scene", sceneEvent);
    
    return controller;
  }

  startControllers(object)
  {
    this.handleControllers(function(controller)
    {
      controller.start();
    }, object);
  }

  stopControllers(object)
  {
    this.handleControllers(function(controller)
    {
      controller.stop();
    }, object);
  }

  updateCameraAspectRatio()
  {
    var camera = this.camera;
    var container = this.container;
    var aspect = container.clientWidth / container.clientHeight;
    BIMROCKET.ObjectUtils.updateCameraAspectRatio(camera, aspect);
  }

  activateCamera(camera)
  {
    this.camera = camera;
    this.updateCameraAspectRatio();

    var changeEvent = {type: "cameraActivated", object: camera,
      source : this};
    this.notifyEventListeners("scene", changeEvent);
  }

  onResize()
  {
    this.updateCameraAspectRatio();
    var container = this.container;
    var renderer = this.renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    this.repaint();
  }

  createPanel(id, title, position)
  {
    var panel = new BIMROCKET.Panel(this);

    if (id) panel.id = id;
    if (title) panel.title = title;
    if (position) panel.position = position;

    this.panelManager.addPanel(panel);

    return panel;
  }

  showLogo()
  {
    document.getElementById("load_panel").className = "visible";
  }

  hideLogo()
  {
    document.getElementById("load_panel").className = "hidden";
  }
};

BIMROCKET.Selection = class
{
  constructor(application)
  {
    this.application = application;
    this._objects = new Set();
  }

  get iterator()
  {
    return this._objects.values();
  }

  get objects()
  {
    return Array.from(this._objects);
  }

  get object()
  {
    let objects = this._objects;
    return objects.size === 0 ? null : objects.values().next().value;
  }

  contains(object)
  {
    return this._objects.has(object);
  }

  isEmpty()
  {
    return this._objects.size === 0;
  }

  get size()
  {
    return this._objects.size;
  }

  set(...objects)
  {
    this._objects.clear();
    this._add(objects);
    this._notifyListeners();
  }

  add(...objects)
  {
    this._add(objects);
    this._notifyListeners();
  }

  remove(...objects)
  {
    let size = this._objects.size;

    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
      this._objects.delete(object);
    }
    
    if (size !== this._objects.size)
    {
      this._notifyListeners();
    }
  }

  clear()
  {
    if (this._objects.size > 0)
    {
      this._objects.clear();
      this._notifyListeners();
    }
  }

  _add(objects)
  {
    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
      if (object instanceof THREE.Object3D)
      {
        this._objects.add(object);
      }
    }
    this._reduce();
  }

  _notifyListeners()
  {
    let selectionEvent = {type : "changed", objects : this.objects};
    this.application.notifyEventListeners("selection", selectionEvent);
  }

  _reduce()
  {
    let objects = this._objects;
    if (objects.size > 1)
    {
      let toRemove = [];
      let iterator = objects.values();
      let item = iterator.next();
      while (!item.done)
      {
        let object = item.value;
        if (this._isContained(object))
        {
          toRemove.push(object);
        }
        item = iterator.next();
      }
      for (let i = 0; i < toRemove.length; i++)
      {
        this._objects.delete(toRemove[i]);
      }
    }
  }

  _isContained(object)
  {
    let contained = false;
    let parent = object.parent;
    while (parent && !contained)
    {
      contained = this._objects.has(parent);
      parent = parent.parent;
    }
    return contained;
  }
};

window.addEventListener("load", function()
{
  BIMROCKET.application = new BIMROCKET.Application();
});
