/*
 * BooleanOperator.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { SolidBuilder } from "./SolidBuilder.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { Solid } from "../core/Solid.js";
import { BSP } from "../core/BSP.js";
import * as THREE from "../lib/three.module.js";

class BooleanOperator extends SolidBuilder
{
  static UNION = "union";
  static INTERSECT = "intersect";
  static SUBTRACT = "subtract";

  constructor(operation)
  {
    super();
    this.operation = operation || BooleanOperator.SUBTRACT;
  }

  performBuild(solid)
  {
    const solids = [];

    for (let i = 2; i < solid.children.length; i++)
    {
      let child = solid.children[i];
      if (child instanceof Solid)
      {
        child.visible = false;
        child.edgesVisible = false;
        child.facesVisible = false;
        solids.push(child);
      }
    }
    if (solids.length === 0) return true;

    const createBSP = function(solid)
    {
      const bsp = new BSP();
      bsp.fromSolidGeometry(solid.geometry, solid.matrix);
      return bsp;
    };

    let resultBSP = createBSP(solids[0]);
    for (let i = 1; i < solids.length; i++)
    {
      let solid = solids[i];
      if (solid.isValid())
      {
        let otherBSP = createBSP(solid);
        switch (this.operation)
        {
          case BooleanOperator.UNION:
            resultBSP = resultBSP.union(otherBSP); break;
          case BooleanOperator.INTERSECT:
            resultBSP = resultBSP.intersect(otherBSP); break;
          case BooleanOperator.SUBTRACT:
            resultBSP = resultBSP.subtract(otherBSP); break;
        }
      }
    }
    let geometry = resultBSP.toSolidGeometry();
    geometry.smoothAngle = this.calculateSmoothAngle(solids);

    solid.updateGeometry(geometry, true);

    return true;
  }

  copy(source)
  {
    this.operation = source.operation;

    return this;
  }

  calculateSmoothAngle(solids)
  {
    let smoothAngle = 0;
    for (let solid of solids)
    {
      if (solid.geometry.smoothAngle > smoothAngle)
      {
        smoothAngle = solid.geometry.smoothAngle;
      }
    }
    return smoothAngle;
  }
}

ObjectBuilder.addClass(BooleanOperator);

export { BooleanOperator };

