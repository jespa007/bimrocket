/**
 * BRFLoader.js
 *
 * @author realor
 */
import { Solid } from "../solid/Solid.js"
import { SolidGeometry } from "../solid/SolidGeometry.js"
import * as THREE from "../lib/three.module.js";

class BRFLoader extends THREE.Loader
{
  constructor()
  {
    super();
  }

  load(url, onLoad, onProgress, onError)
  {
		const loader = new FileLoader(this.manager);
		loader.setPath(this.path);
		loader.setRequestHeader(this.requestHeader);
		loader.setWithCredentials(this.withCredentials);
		loader.load(url, text =>
    {
			try
      {
				onLoad(this.parse(text));
			}
      catch (ex)
      {
				if (onError)
        {
					onError(ex);
				}
        else
        {
					console.error(ex);
				}
				this.manager.itemError(url);
			}
		}, onProgress, onError);
  }

  parse(text)
  {
    let rootObject = null;

    let model = JSON.parse(text);

    // parse geometries
    const geometries = model.geometries;
    for (let id in geometries)
    {
      let entry = geometries[id];
      entry._geometry = this.parseGeometry(entry);
    }

    // parse materials
    const materials = model.materials;
    for (let id in materials)
    {
      let entry = materials[id];
      entry._material = this.parseMaterial(entry);
    }

    // parse objects
    const objects = model.objects;
    for (let id in objects)
    {
      let entry = objects[id];
      entry._object = this.parseObject(entry, model);
    }

    // build object tree
    for (let id in objects)
    {
      let entry = objects[id];
      let object = entry._object;
      if (entry.parent)
      {
        let parent = objects[entry.parent]._object;
        if (parent)
        {
          parent.add(object);
        }
      }
      else rootObject = object;
    }

    return rootObject;
  }

  parseGeometry(entry)
  {
    let geometry = null;

    if (entry.type === "SolidGeometry")
    {
      geometry = new SolidGeometry();
      geometry.isManifold = entry.isManifold;

      for (let vertex of entry.vertices)
      {
        let position = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
        geometry.vertices.push(position);
      }
      for (let face of entry.faces)
      {
        geometry.addFace(...face);
      }
      geometry.updateFaceNormals();
    }
    else if (entry.type === "BufferGeometry")
    {
      geometry = new THREE.BufferGeometry();
      for (let name in entry.attributes)
      {
        let attribute = entry.attributes[name];
        let array = attribute.array;
        let itemSize = attribute.itemSize;
        let normalized = attribute.normalized;
        let typedArray;
        switch (attribute.arrayType)
        {
          case "Float32Array" :
            typedArray = new Float32Array(array);
            break;
          case "Uint32Array" :
            typedArray = new Uint32Array(array);
            break;
          case "Uint16Array" :
            typedArray = new Uint16Array(array);
            break;
          default:
            throw "Unsupported TypedArray: " + attribute.arrayType;
        }
        let bufferAttribute =
          new THREE.BufferAttribute(typedArray, itemSize, normalized);
        geometry.setAttribute(name, bufferAttribute);
      }
    }
    return geometry;
  }

  parseMaterial(entry)
  {
    let material = new THREE[entry.type];
    material.name = entry.name;
    material.opacity = entry.opacity;
    material.transparent = entry.transparent;
    material.side = entry.side;

    if (entry.color)
    {
      material.color.set(entry.color);
    }

    if (material instanceof THREE.MeshPhongMaterial)
    {
      material.shininess = entry.shininess;
      material.reflectivity = entry.reflectivity;
      material.specular.set(entry.specular);
      material.emissive.set(entry.emissive);
    }
    return material;
  }

  parseObject(entry, model)
  {
    let object = null;

    if (entry.type === "Object3D")
    {
      object = new THREE.Object3D();
    }
    else if (entry.type === "Group")
    {
      object = new THREE.Group();
    }
    else if (entry.type === "Solid")
    {
      object = new Solid();
      object.edgesVisible = entry.edgesVisible;
      object.facesVisible = entry.facesVisible;
    }
    else if (entry.type === "Mesh")
    {
      object = new THREE.Mesh();
    }
    object.name = entry.name;
    object.visible = entry.visible;

    let position = entry.position;
    if (position)
    {
      object.position.set(position.x, position.y, position.z);
    }

    let rotation = entry.rotation;
    if (rotation)
    {
      object.rotation.set(rotation.x, rotation.y, rotation.z);
    }

    let scale = entry.scale;
    if (scale)
    {
      object.scale.set(scale.x, scale.y, scale.z);
    }

    const geometries = model.geometries;
    if (entry.geometry && geometries[entry.geometry])
    {
      let geometry = geometries[entry.geometry]._geometry;
      if (geometry instanceof SolidGeometry)
      {
        object.updateGeometry(geometry, false);
      }
      else if (geometry instanceof THREE.BufferGeometry)
      {
        object.geometry = geometry;
      }
    }

    const materials = model.materials;
    if (entry.material && materials[entry.material])
    {
      let material = materials[entry.material]._material;
      if (material)
      {
        object.material = material;
      }
    }

    if (entry.userData)
    {
      object.userData = entry.userData;
    }

    return object;
  }
}

export { BRFLoader };
