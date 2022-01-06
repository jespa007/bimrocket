/**
 * GeometryUtils.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";

class GeometryUtils
{
  static PRECISION = 0.00001;
  static _vector1 = new THREE.Vector3;
  static _vector2 = new THREE.Vector3;
  static _vector3 = new THREE.Vector3;
  static _vector4 = new THREE.Vector3;
  static _vector5 = new THREE.Vector3;
  static _plane1 = new THREE.Plane;

  static isPointOnSegment(pointToCheck, pointA, pointB, distance = 0.0001)
  {
    const vAB = GeometryUtils._vector1;
    const vAP = GeometryUtils._vector2;

    vAB.subVectors(pointB, pointA);
    vAP.subVectors(pointToCheck, pointA);

    const lengthAB = vAB.length();
    const lengthAP = vAP.length();
    vAB.normalize();

    const proj = vAP.dot(vAB);
    if (proj < 0 || proj > lengthAB) return false;

    return lengthAP * lengthAP - proj * proj < distance * distance;
  }

  static linesIntersect(line1, line2, position)
  {
    const vector1 = GeometryUtils._vector3;
    const vector2 = GeometryUtils._vector4;
    const normal = GeometryUtils._vector5;
    const plane = GeometryUtils._plane1;

    vector1.subVectors(line1.end, line1.start).normalize();
    vector2.subVectors(line2.end, line2.start).normalize();
    if (Math.abs(vector1.dot(vector2)) < 0.9999) // are not parallel
    {
      normal.copy(vector1).cross(vector2).normalize();
      plane.setFromNormalAndCoplanarPoint(normal, line1.start);
      if (Math.abs(plane.distanceToPoint(line2.start)) < 0.001)
      {
        // are coplanars
        vector1.cross(normal).normalize();
        plane.setFromNormalAndCoplanarPoint(vector1, line1.start);
        if (plane.intersectLine(line2, position))
        {
          vector2.cross(normal).normalize();
          plane.setFromNormalAndCoplanarPoint(vector2, line2.start);
          if (plane.intersectLine(line1, position))
          {
            return true;
          }
        }
      }
    }
    return false;
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

  static orthogonalVector(vector)
  {
    if (Math.abs(vector.x) > 0.1)
    {
      return new THREE.Vector3(vector.y, -vector.x, vector.z);
    }
    else if (Math.abs(vector.y) > 0.1)
    {
      return new THREE.Vector3(-vector.y, vector.x, vector.z);
    }
    else // (0, 0, z)
    {
      return new THREE.Vector3(-vector.z, 0, 0);
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
}

export { GeometryUtils };
