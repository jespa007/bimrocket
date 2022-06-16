/**
 * GeometryUtils.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";

class GeometryUtils
{
  static PRECISION = 0.00001;
  static _vector1 = new THREE.Vector3();
  static _vector2 = new THREE.Vector3();
  static _vector3 = new THREE.Vector3();
  static _vector4 = new THREE.Vector3();
  static _vector5 = new THREE.Vector3();
  static _plane1 = new THREE.Plane();

  static isPointOnSegment(point, pointA, pointB, distance = 0.0001)
  {
    const projectedPoint = this._vector1;

    if (this.projectPointOnSegment(point, pointA, pointB, projectedPoint))
    {
      return projectedPoint.distanceToSquared(point) < distance * distance;
    }
    return false;
  }

  static projectPointOnSegment(point, pointA, pointB, projectedPoint)
  {
    const vAB = this._vector2;
    const vAP = this._vector3;
    const vProjAB = this._vector4;

    vAB.subVectors(pointB, pointA);
    vAP.subVectors(point, pointA);

    const denominator = vAB.lengthSq();

    if (denominator === 0) return null;

		const scalar = vAB.dot(vAP) / denominator;

    if (scalar >= 0 && scalar <= 1)
    {
		  vProjAB.copy(vAB).multiplyScalar(scalar);

      if (!(projectedPoint instanceof THREE.Vector3))
      {
        projectedPoint = new THREE.Vector3();
      }
      projectedPoint.copy(pointA).add(vProjAB);

      return projectedPoint;
    }
    return null;
  }

  static intersectLines(line1, line2, position1, position2)
  {
    const vector1 = GeometryUtils._vector1;
    const vector2 = GeometryUtils._vector2;
    const normal = GeometryUtils._vector5;
    const plane = GeometryUtils._plane1;
    position1 = position1 || GeometryUtils._vector3;
    position2 = position2 || GeometryUtils._vector4;

    vector1.subVectors(line1.end, line1.start).normalize();
    vector2.subVectors(line2.end, line2.start).normalize();

    if (Math.abs(vector1.dot(vector2)) < 0.9999) // are not parallel
    {
      normal.copy(vector1).cross(vector2).normalize();

      vector1.cross(normal).normalize();
      plane.setFromNormalAndCoplanarPoint(vector1, line1.start);
      if (plane.intersectLine(line2, position2))
      {
        vector2.cross(normal).normalize();
        plane.setFromNormalAndCoplanarPoint(vector2, line2.start);
        if (plane.intersectLine(line1, position1))
        {
          return position1.distanceTo(position2);
        }
      }
    }
    return -1;
  }

  static calculateNormal(vertexPositions, accessFn, normal)
  {
    if (!(normal instanceof THREE.Vector3)) normal = new THREE.Vector3();
    else normal.set(0, 0, 0);

    // Newell's method
    const count = vertexPositions.length;
    let pi, pj;
    for (let i = 0; i < count; i++)
    {
      let j = (i + 1) % count;
      if (accessFn)
      {
        pi = accessFn(vertexPositions[i]);
        pj = accessFn(vertexPositions[j]);
      }
      else
      {
        pi = vertexPositions[i];
        pj = vertexPositions[j];
      }
      normal.x += (pi.y - pj.y) * (pi.z + pj.z);
      normal.y += (pi.z - pj.z) * (pi.x + pj.x);
      normal.z += (pi.x - pj.x) * (pi.y + pj.y);
    }
    normal.normalize();
    return normal;
  }

  /* triangulate a 3D face */
  static triangulateFace(vertices, holes, normal)
  {
    const vx = GeometryUtils._vector1;
    const vy = GeometryUtils._vector2;
    const vz = GeometryUtils._vector3;

    if (normal instanceof THREE.Vector3)
    {
      vz.copy(normal);
    }
    else
    {
      GeometryUtils.calculateNormal(vertices, undefined, vz);
    }
    const v0 = vertices[0];
    const v1 = vertices[1];
    vx.subVectors(v1, v0).normalize();
    vy.crossVectors(vz, vx);

    const matrix = new THREE.Matrix4();
    matrix.set(vx.x, vy.x, vz.x, v0.x,
             vx.y, vy.y, vz.y, v0.y,
             vx.z, vy.z, vz.z, v0.z,
             0, 0, 0, 1).invert();

    const projectVertices = (vertices) =>
    {
      let projectedVertices = [];
      for (let vertex of vertices)
      {
        let point = new THREE.Vector3();
        point.copy(vertex);
        projectedVertices.push(point.applyMatrix4(matrix));
      }
      return projectedVertices;
    };

    let projectedVertices = projectVertices(vertices);
    let projectedHoles = [];
    for (let hole of holes)
    {
      projectedHoles.push(projectVertices(hole));
    }

    return THREE.ShapeUtils.triangulateShape(projectedVertices, projectedHoles);
  }

  static intersectLinePlane(v1, v2, plane)
  {
    let v21 = v2.clone().sub(v1);

    let t = -(plane.normal.dot(v1) + plane.constant) / plane.normal.dot(v21);

    return v21.multiplyScalar(t).add(v1);
  }

  static orthogonalVector(vector, orthoVector)
  {
    if (!(orthoVector instanceof THREE.Vector3))
    {
      orthoVector = new THREE.Vector3();
    }

    if (Math.abs(vector.x) > 0.1)
    {
      orthoVector.set(vector.y, -vector.x, vector.z);
    }
    else if (Math.abs(vector.y) > 0.1)
    {
      orthoVector.set(-vector.y, vector.x, vector.z);
    }
    else // (~0, ~0, z)
    {
      orthoVector.set(-vector.z, vector.y, vector.x);
    }
    return orthoVector.cross(vector);
  }

  static traverseBufferGeometryVertices(geometry, callback)
  {
    const position = this._vector1;
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3)
    {
      position.x = positions[i];
      position.y = positions[i + 1];
      position.z = positions[i + 2];

      callback(position);
    }
  }

  static getBufferGeometryVertices(geometry)
  {
    const positions = geometry.attributes.position.array;
    const vertices = [];
    for (let i = 0; i < positions.length; i += 3)
    {
      let x = positions[i];
      let y = positions[i + 1];
      let z = positions[i + 2];
      vertices.push(new THREE.Vector3(x, y, z));
    }
    return vertices;
  }

  static getBufferGeometryFaces(geometry, addFace)
  {
    const positions = geometry.attributes.position.array;
    if (geometry.index) // indexed geometry
    {
      let indices = geometry.index.array;
      for (let i = 0; i < indices.length; i += 3)
      {
        let va = indices[i];
        let vb = indices[i + 1];
        let vc = indices[i + 2];

        addFace(va, vb, vc);
      }
    }
    else // non indexed geometry
    {
      var vertexCount = positions.length / 3;
      for (let i = 0; i < vertexCount; i += 3)
      {
        let va = i;
        let vb = i + 1;
        let vc = i + 2;

        addFace(va, vb, vc);
      }
    }
  }

  /**
   * Simplified version of BufferGeometryUtils.mergeBufferGeometries
   *
   * @param {Array<BufferGeometry>} geometries
   * @param {Boolean} useGroups
   * @return {BufferAttribute}
   */
  static mergeBufferGeometries(geometries, useGroups = false)
  {
    const isIndexed = geometries[0].index !== null;
    const attributesUsed = new Set(Object.keys(geometries[0].attributes));
    const attributes = {};
    const mergedGeometry = new THREE.BufferGeometry();

    let offset = 0;

    for (let i = 0; i < geometries.length; ++i)
    {
      const geometry = geometries[i];
      let attributesCount = 0;

      // ensure that all geometries are indexed, or none

      if (isIndexed !== (geometry.index !== null))
      {
        console.error('Not common attributes');
        return null;
      }

      // gather attributes, exit early if they're different
      for (const name in geometry.attributes)
      {
        if (!attributesUsed.has(name))
        {
          console.error('Not common attributes');
          return null;
        }

        if (attributes[name] === undefined)
        {
          attributes[name] = [];
        }

        attributes[name].push(geometry.attributes[name]);
        attributesCount++;
      }

      // ensure geometries have the same number of attributes

      if (attributesCount !== attributesUsed.size)
      {
        console.error('Not all geometries have the same number of attributes.');
        return null;
      }

      // gather .userData

      mergedGeometry.userData.mergedUserData =
        mergedGeometry.userData.mergedUserData || [];
      mergedGeometry.userData.mergedUserData.push(geometry.userData);

      if (useGroups)
      {
        let count;

        if (isIndexed)
        {
          count = geometry.index.count;
        }
        else if (geometry.attributes.position !== undefined)
        {
          count = geometry.attributes.position.count;
        }
        else
        {
          console.error('Geometry has not an index or a position attribute');
          return null;
        }
        mergedGeometry.addGroup(offset, count, i);
        offset += count;
      }
    }

    // merge indices

    if (isIndexed)
    {
      let indexOffset = 0;
      const mergedIndex = [];

      for (let i = 0; i < geometries.length; ++i)
      {
        const index = geometries[i].index;

        for (let j = 0; j < index.count; ++j)
        {
          mergedIndex.push(index.getX(j) + indexOffset);
        }
        indexOffset += geometries[i].attributes.position.count;
      }
      mergedGeometry.setIndex(mergedIndex);
    }

    // merge attributes

    for (const name in attributes)
    {
      const mergedAttribute = this.mergeBufferAttributes(attributes[name]);

      if (!mergedAttribute)
      {
        console.error('Failed while merging the ' + name + ' attribute.');
        return null;
      }
      mergedGeometry.setAttribute(name, mergedAttribute);
    }
    return mergedGeometry;
  }

  /**
   * @param {Array<BufferAttribute>} attributes
   * @return {BufferAttribute}
   */
  static mergeBufferAttributes(attributes)
  {
    let TypedArray;
    let itemSize;
    let normalized;
    let arrayLength = 0;

    for (let i = 0; i < attributes.length; ++i)
    {
      const attribute = attributes[ i ];

      if (attribute.isInterleavedBufferAttribute)
      {
        console.error('InterleavedBufferAttributes are not supported.');
        return null;
      }

      if (TypedArray === undefined)
      {
        TypedArray = attribute.array.constructor;
      }

      if (TypedArray !== attribute.array.constructor)
      {
        console.error('BufferAttribute.array is not consistent.');
        return null;
      }

      if (itemSize === undefined)
      {
        itemSize = attribute.itemSize;
      }

      if (itemSize !== attribute.itemSize)
      {
        console.error('BufferAttribute.itemSize is not consistent.');
        return null;
      }

      if (normalized === undefined)
      {
        normalized = attribute.normalized;
      }

      if (normalized !== attribute.normalized)
      {
        console.error('BufferAttribute.normalized is not consistent.');
        return null;
      }
      arrayLength += attribute.array.length;
    }

    const array = new TypedArray(arrayLength);
    let offset = 0;

    for (let i = 0; i < attributes.length; ++i)
    {
      array.set(attributes[i].array, offset);
      offset += attributes[i].array.length;
    }
    return new THREE.BufferAttribute(array, itemSize, normalized);
  }
}

export { GeometryUtils };
