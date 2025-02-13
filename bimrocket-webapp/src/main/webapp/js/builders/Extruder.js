/*
 * Extruder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { SolidBuilder } from "./SolidBuilder.js";
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { Cord } from "../core/Cord.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import * as THREE from "../lib/three.module.js";

class Extruder extends SolidBuilder
{
  depth = 1;
  direction = new THREE.Vector3(0, 0, 1);
  minPointDistance = 0.0001;
  smoothAngle = 0;

  constructor(depth, direction)
  {
    super();
    if (typeof depth === "number")
    {
      this.depth = depth;
    }
    if (direction instanceof THREE.Vector3)
    {
      this.direction.copy(direction);
    }
  }

  performBuild(solid)
  {
    const direction = this.direction;

    let profile = this.findClosedProfile(solid);
    if (profile === undefined) return true;
    profile.visible = false;

    const shape = profile.geometry.path;

    const points = shape.extractPoints(profile.geometry.divisions);
    let outerRing = points.shape;
    let innerRings = points.holes;

    // prepare shape, orient rings and remove duplicated vertices

    const removeDuplicatedVertices = ring =>
    {
      let i = 0;
      for (let j = 1; j < ring.length; j++)
      {
        let point1 = ring[i];
        let point2 = ring[j];
        if (point1.distanceTo(point2) >= this.minPointDistance)
        {
          i++;
          ring[i] = point2;
        }
      }
      while (i < ring.length - 1)
      {
        ring.pop();
      }

      if (ring.length >= 2 &&
          ring[0].distanceTo(ring[ring.length - 1]) < this.minPointDistance)
      {
        ring.pop();
      }
    };

    removeDuplicatedVertices(outerRing);

    if (outerRing.length < 3)
    {
      throw "Can't extrude an invalid profile";
    }

    innerRings.forEach(removeDuplicatedVertices);
    innerRings = innerRings.filter(innerRing => innerRing.length >= 3);

    if (THREE.ShapeUtils.isClockWise(outerRing))
    {
      outerRing = outerRing.reverse();
    }

    for (let h = 0; h < innerRings.length; h++)
    {
      let innerRing = innerRings[h];

      if (THREE.ShapeUtils.isClockWise(innerRing))
      {
        innerRings[h] = innerRing.reverse();
      }
    }

    let cordPoints;
    let extrudeVector = null;

    let cord = this.findCord(solid);
    if (cord && cord.geometry)
    {
      cord.visible = false;
      cordPoints = cord.geometry.points;

      //remove duplicated vertices
      const array = [];
      array.push(cordPoints[0]);
      for (let i = 1; i < cordPoints.length; i++)
      {
        if (cordPoints[i - 1].distanceTo(cordPoints[i]) >= this.minPointDistance)
        {
          array.push(cordPoints[i].clone());
        }
      }
      if (array.length < 2) return;
      cordPoints = array;

      for (let point of cordPoints)
      {
        point.applyMatrix4(cord.matrix);
      }
    }
    else
    {
      if (this.depth === 0)
      {
        solid.updateGeometry(new SolidGeometry());
        return true;
      }

      // extrude in direction vector
      extrudeVector = new THREE.Vector3();
      extrudeVector.copy(direction).normalize();
      extrudeVector.multiplyScalar(this.depth * Math.sign(direction.z));

      // create cordPoints from direction
      cordPoints = []; // Point3D[]
      cordPoints.push(new THREE.Vector3(0, 0, 0));
      cordPoints.push(new THREE.Vector3(0, 0, extrudeVector.z));
    }

    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    const vs = new THREE.Vector3();
    const vx = new THREE.Vector3();
    const vy = new THREE.Vector3();
    const vz = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const ray = new THREE.Ray();

    // add fake point to generate last ring
    let length = cordPoints.length;
    vs.subVectors(cordPoints[length - 1], cordPoints[length - 2]);
    let last = new THREE.Vector3();
    last.copy(cordPoints[length - 1]).add(vs);
    cordPoints.push(last);

    // create matrix from initial segment of cordPoints
    p1.copy(cordPoints[0]);
    p2.copy(cordPoints[1]);
    vz.subVectors(p2, p1);
    vz.normalize();
    if (vz.y !== 0) vx.set(-vz.y, vz.x, 0).normalize();
    else if (vz.x !== 0) vx.set(vz.y, -vz.x, 0).normalize();
    else vx.set(1, 0, 0);
    vy.crossVectors(vz, vx);
    let matrix = new THREE.Matrix4();
    matrix.set(
      vx.x, vy.x, vz.x, p1.x,
      vx.y, vy.y, vz.y, p1.y,
      vx.z, vy.z, vz.z, p1.z,
      0, 0, 0, 1);
    matrix.multiply(profile.matrix);

    const geometry = new SolidGeometry();

    const addVertices = ring =>
    {
      for (let i = 0; i < ring.length; i++)
      {
        let vertex2 = ring[i];
        let vertex3 = new THREE.Vector3(vertex2.x, vertex2.y, 0);
        vertex3.applyMatrix4(matrix);
        geometry.vertices.push(vertex3);
      }
    };

    const getPlane = (v1, v2, point) =>
    {
      let normal = new THREE.Vector3();
      if (Math.abs(v1.dot(v2)) > 0.9999)
      {
        normal = v1;
      }
      else
      {
        let s = new THREE.Vector3();
        s.subVectors(v2, v1).normalize();
        let v = new THREE.Vector3();
        v.crossVectors(s, v1).normalize();
        normal.crossVectors(s, v).normalize();
      }
      let plane = new THREE.Plane();
      plane.setFromNormalAndCoplanarPoint(normal, point);

      return plane;
    };

    // add all ring vertices

    addVertices(outerRing);
    for (let h = 0; h < innerRings.length; h++)
    {
      let innerRing = innerRings[h];
      addVertices(innerRing);
    }

    // add bottom face (vertices1)
    let offset = 0;
    let indices = [];
    for (let i = 0; i < outerRing.length; i++)
    {
      indices.push(offset++);
    }
    indices.reverse();
    let bottomFace = geometry.addFace(...indices);
    for (let innerRing of innerRings)
    {
      indices = [];
      for (let i = 0; i < innerRing.length; i++)
      {
        indices.push(offset++);
      }
      indices.reverse();
      bottomFace.addHole(...indices);
    }

    let stepVertexCount = geometry.vertices.length;
    let offset1 = 0;
    let offset2 = stepVertexCount;
    // create side faces
    for (let i = 1; i < cordPoints.length - 1; i++)
    {
      p1.copy(cordPoints[i - 1]);
      p2.copy(cordPoints[i]);
      p3.copy(cordPoints[i + 1]);

      v1.subVectors(p2, p1).normalize();
      v2.subVectors(p3, p2).normalize();
      let plane = getPlane(v1, v2, p2);
      for (let i = 0; i < stepVertexCount; i++)
      {
        ray.set(geometry.vertices[offset1 + i], v1);
        let vertex = new THREE.Vector3();
        vertex = ray.intersectPlane(plane, vertex);
        if (vertex === null)
          throw "Can't extrude this profile for the given directrix";
        geometry.vertices.push(vertex);
      }

      // add outer ring side faces
      for (let i = 0; i < outerRing.length; i++)
      {
        let va1 = offset1 + i;
        let vb1 = offset1 + (i + 1) % outerRing.length;

        let va2 = offset2 + i;
        let vb2 = offset2 + (i + 1) % outerRing.length;

        geometry.addFace(va1, vb1, vb2, va2);
      }

      // add inner rings side faces

      let innerRingOffset = outerRing.length;
      for (let r = 0; r < innerRings.length; r++)
      {
        let innerRing = innerRings[r];

        for (let i = 0; i < innerRing.length; i++)
        {
          let va1 = offset1 + innerRingOffset + i;
          let vb1 = offset1 + innerRingOffset + (i + 1) % innerRing.length;

          let va2 = offset2 + innerRingOffset + i;
          let vb2 = offset2 + innerRingOffset + (i + 1) % innerRing.length;

          geometry.addFace(vb1, va1, va2, vb2); // reverse face
        }
        innerRingOffset += innerRing.length;
      }

      offset1 = offset2;
      offset2 += stepVertexCount;
    }

    indices = [];
    offset = offset1;
    for (let i = 0; i < outerRing.length; i++)
    {
      indices.push(offset++);
    }
    let topFace = geometry.addFace(...indices);
    for (let innerRing of innerRings)
    {
      indices = [];
      for (let i = 0; i < innerRing.length; i++)
      {
        indices.push(offset++);
      }
      topFace.addHole(...indices);
    }

    if (extrudeVector)
    {
      /* shear */
      const a = extrudeVector.x / extrudeVector.z;
      const b = extrudeVector.y / extrudeVector.z;
      const shearMatrix = new THREE.Matrix4();
      shearMatrix.elements[8] = a;
      shearMatrix.elements[9] = b;

      if (direction.z < 0)
      {
        const reverseMatrix = new THREE.Matrix4();
        extrudeVector.multiplyScalar(-1);
        reverseMatrix.makeTranslation(extrudeVector.x, extrudeVector.y,
          extrudeVector.z);
        shearMatrix.multiplyMatrices(reverseMatrix, shearMatrix);
      }
      geometry.applyMatrix4(shearMatrix);
    }

    geometry.isManifold = true;
    geometry.smoothAngle = this.smoothAngle;

    solid.updateGeometry(geometry);

    return true;
  }

  findClosedProfile(solid)
  {
    for (let child of solid.children)
    {
      if (child instanceof Profile)
      {
        if (child.geometry && child.geometry.isClosed())
          return child;
      }
    }
    return undefined;
  }

  findCord(solid)
  {
    for (let child of solid.children)
    {
      if (child instanceof Cord)
      {
        if (child.geometry)
          return child;
      }
    }
    return undefined;
  }

  copy(source)
  {
    this.depth = source.depth;
    this.direction.copy(source.direction);

    return this;
  }
};

ObjectBuilder.addClass(Extruder);

export { Extruder }


