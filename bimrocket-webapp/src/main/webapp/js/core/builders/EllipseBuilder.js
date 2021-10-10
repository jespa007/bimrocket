/*
 * EllipseBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { ProfileBuilder } from "./ProfileBuilder.js";
import { ProfileGeometry } from "../ProfileGeometry.js";
import * as THREE from "../../lib/three.module.js";

class EllipseBuilder extends ProfileBuilder
{
  constructor(xradius = 1, yradius = 0.5, segments = 16)
  {
    super();
    this.xradius = xradius;
    this.yradius = yradius;
    this.segments = segments;
  }

  performBuild(profile)
  {
    const shape = new THREE.Shape();

    this.drawEllipse(shape, this.xradius, this.yradius, this.segments);

    profile.updateGeometry(new ProfileGeometry(shape));

    return true;
  }

  drawEllipse(path, xradius, yradius, segments)
  {
    const incr = 2 * Math.PI / segments;

    path.moveTo(xradius, 0);
    for (let rad = incr; rad < 2 * Math.PI; rad += incr)
    {
      path.lineTo(xradius * Math.cos(rad), yradius * Math.sin(rad));
    }
    path.closePath();
  }
};

ObjectBuilder.registerBuilder(EllipseBuilder);

export { EllipseBuilder };


