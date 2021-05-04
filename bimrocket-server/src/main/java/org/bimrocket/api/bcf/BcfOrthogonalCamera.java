/*
 * BIMROCKET
 *  
 * Copyright (C) 2021, Ajuntament de Sant Feliu de Llobregat
 *  
 * This program is licensed and may be used, modified and redistributed under 
 * the terms of the European Public License (EUPL), either version 1.1 or (at 
 * your option) any later version as soon as they are approved by the European 
 * Commission.
 *  
 * Alternatively, you may redistribute and/or modify this program under the 
 * terms of the GNU Lesser General Public License as published by the Free 
 * Software Foundation; either  version 3 of the License, or (at your option) 
 * any later version. 
 *   
 * Unless required by applicable law or agreed to in writing, software 
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT 
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
 *    
 * See the licenses for the specific language governing permissions, limitations 
 * and more details.
 *    
 * You should have received a copy of the EUPL1.1 and the LGPLv3 licenses along 
 * with this program; if not, you may find them at: 
 *    
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 * http://www.gnu.org/licenses/ 
 * and 
 * https://www.gnu.org/licenses/lgpl.txt
 */
package org.bimrocket.api.bcf;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 *
 * @author realor
 */
public class BcfOrthogonalCamera
{
  @JsonProperty("camera_view_point")
  private BcfPoint viewPoint;

  @JsonProperty("camera_direction")
  private BcfDirection direction;

  @JsonProperty("camera_up_vector")
  private BcfDirection upVector;

  @JsonProperty("view_to_world_scale")
  private double viewToWorldScale;

  public BcfPoint getViewPoint()
  {
    return viewPoint;
  }

  public void setViewPoint(BcfPoint viewPoint)
  {
    this.viewPoint = viewPoint;
  }

  public BcfDirection getDirection()
  {
    return direction;
  }

  public void setDirection(BcfDirection direction)
  {
    this.direction = direction;
  }

  public BcfDirection getUpVector()
  {
    return upVector;
  }

  public void setUpVector(BcfDirection upVector)
  {
    this.upVector = upVector;
  }

  public double getViewToWorldScale()
  {
    return viewToWorldScale;
  }

  public void setViewToWorldScale(double viewToWorldScale)
  {
    this.viewToWorldScale = viewToWorldScale;
  }
}
