BIMROCKET.IOManager = class
{
  static formats = 
  {
    "dae" :
    {
      description: "Collada (*.dae)",
      extension: "dae",
      loaderClass : THREE.ColladaLoader,
      exporterClass : THREE.ColladaExporter,
      options : {}
    },
    "obj" :
    {
      description: "Wavefront object (*.obj)",
      extension: "obj",
      loaderClass : THREE.OBJLoader,
      exporterClass : THREE.OBJExporter, 
      options : {}
    },
    "stl" :
    {
      description : "Stereolithography (*.stl)",
      extension: "stl",
      loaderClass : THREE.STLLoader,
      exporterClass : THREE.STLExporter,
      options : {}
    },
    "json" :
    {
      description : "GeoJSON (*.json)",
      extension: "json",
      loaderClass : BIMROCKET.GeoJSONLoader,
      options : {}
    },
    "gml" :
    {
      description : "Geography markup language (*.gml)",
      extension: "gml",
      loaderClass : BIMROCKET.GMLLoader,
      options : {}
    },
    "ifc" :
    {
      description : "Industry foundation classes STEP (*.ifc)",
      extension: "ifc",
      loaderClass: BIMROCKET.IFC.STEPLoader,
      options : {}
    }            
  }
  
  static getFormat(name)
  {
    let format = null;
    if (typeof name === "string")
    {
      let index = name.lastIndexOf(".");
      if (index !== -1)
      {
        format = name.substring(index + 1).toLowerCase();
      }
    }
    return format;
  }

  static getFormatInfo(name)
  {
    let format = this.getFormat(name);
    let formatInfo = format ?
      BIMROCKET.IOManager.formats[format] :
      BIMROCKET.IOManager.formats[name];
    return formatInfo || null;
  }

  static createLoader(format)
  {
    let loader = null;
    let formatInfo = this.formats[format];
    if (formatInfo && formatInfo.loaderClass)
    {
      loader = new formatInfo.loaderClass();
    }
    return loader;
  }

  static createExporter(format)
  {
    var exporter = null;
    var formatInfo = this.formats[format];
    if (formatInfo && formatInfo.exporterClass)
    {
      exporter = new formatInfo.exporterClass();
    }
    return exporter;
  }

  static load(intent)
  {
    let format = intent.format;
    let url = intent.url;
    let data = intent.data;
    let onCompleted = intent.onCompleted; // onCompleted(object3D)
    let onProgress = intent.onProgress; // onProgress({progress: 0..100, message: text})
    let onError = intent.onError; // onError(error)
    let options = intent.options;
    
    try
    {
      if (!format && url)
      {
        format = this.getFormat(url);
      }
      if (!format) throw "Can't determinate format";
      
      let loader = this.createLoader(format);

      if (!loader) throw "Unsupported format: " + format;

      loader.options = options || {};
      if (data)
      {
        this.parseData(loader, url, data, onCompleted, onProgress, onError);
      }
      else
      {
        let scope = this;
        let request = new XMLHttpRequest();
        let length = 0;
        request.onreadystatechange = function()
        {
          if (request.readyState === 4)
          {
            onProgress({progress : 100, message : ""});

            if (request.status === 0 ||
              request.status === 200 || request.status === 207)
            {
              data = request.responseText;
              try
              {
                scope.parseData(loader, url, data, 
                  onCompleted, onProgress, onError);
              }
              catch (exc)
              {
                if (onError) onError(exc);
              }
            }
            else
            {
              onError(request.statusText + " (" + request.status + ")");
            }
          }
          else if (request.readyState === 3)
          {
            if (onProgress)
            {
              if (length === 0)
              {
                length = request.getResponseHeader("Content-Length");
              }
              else
              {
                let progress = Math.round(
                  100 * request.responseText.length / length);
                let message = "Downloading file...";
                onProgress({progress : progress, message : message});
              }
            }
          }
        };
        request.open("GET", url, true);
        request.send();
      }
    }
    catch (ex)
    {
      if (onError) onError(ex);
    }
  }

  static export(intent)
  {
    let format = intent.format;
    let name = intent.name;
    let onCompleted = intent.onCompleted;
    let onProgress = intent.onProgress;
    let onError = intent.onError;
    let object = intent.object;
    let options = intent.options;
    
    try
    {
      if (!format && name)
      {
        format = this.getFormat(name);
      }

      if (!format) throw "Can't determinate format";

      let exporter = this.createExporter(format);

      if (!exporter) throw "Unsupported format: " + format;
      
      if (options)
      {
        exporter.options = options;
      }
      return this.parseObject(exporter, object, 
        onCompleted, onProgress, onError);
    }
    catch (ex)
    {
      if (onError) onError(ex);
      throw ex;
    }
  }

  static parseData(loader, url, data, onCompleted, onProgress, onError)
  {
    if (loader instanceof THREE.ColladaLoader)
    {
      let path = THREE.LoaderUtils.extractUrlBase(url);
      let result = loader.parse(data, path);
      if (onCompleted) onCompleted(result.scene);
    }
    else if (loader instanceof BIMROCKET.IFC.STEPLoader)
    {
      loader.parse(data, onCompleted, onProgress, onError);
    }
    else // general case
    {
      let result = loader.parse(data);
      let object = this.createObject(result);
      if (onCompleted) onCompleted(object);
    }
  }
  
  static parseObject(exporter, object, onCompleted, onProgress, onError)
  {
    let data = "";
    let result = exporter.parse(object);
    if (result)
    {
      if (typeof result === "string")
      {
        data = new Blob([result], {type: 'text/plain'});
      }
      else if (typeof result.data === "string")
      {
        data = new Blob([result.data], {type: 'text/plain'});      
      }
    }
    if (onCompleted) onCompleted(data);
    return data;
  }
  
  static createObject(result)
  {
    if (result instanceof THREE.BufferGeometry)
    {
      let geometry = result;
      let material = new THREE.MeshPhongMaterial(
        {color : 0x008000, side : THREE.DoubleSide});
      let object = new THREE.Mesh(geometry, material);
      object.updateMatrix();
      return object;
    }
    else if (result instanceof THREE.Object3D)
    {
      let object = result;
      object.traverse(function(o){ o.updateMatrix(); });
      return object;
    }    
  }
};


