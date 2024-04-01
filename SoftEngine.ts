///<reference path="babylon.math.ts"/>

module SoftEngine {
  export interface Face {
    A: number;
    B: number;
    C: number;
  }

  export interface Vertex {
    Normal: BABYLON.Vector3;
    Coordinates: BABYLON.Vector3;
    WorldCoordinates: BABYLON.Vector3;
  }

  export interface ScanLineData {
    currentY?: number;
    ndotla?: number;
    ndotlb?: number;
    ndotlc?: number;
    ndotld?: number;
  }

  export class Camera {
    Position: BABYLON.Vector3;
    Target: BABYLON.Vector3;

    constructor() {
      this.Position = BABYLON.Vector3.Zero();
      this.Target = BABYLON.Vector3.Zero();
    }
  }

  export class Mesh {
    Position: BABYLON.Vector3;
    Rotation: BABYLON.Vector3;
    Vertices: Vertex[];
    UVs: BABYLON.Vector2[];
    Faces: Face[];

    constructor(public name: string, verticesCount: number, faceCount: number) {
      this.Vertices = new Array(verticesCount);
      this.Faces = new Array(faceCount);
      this.Rotation = BABYLON.Vector3.Zero();
      this.Position = BABYLON.Vector3.Zero();
      this.UVs = new Array(verticesCount);
    }
  }

  export class Device {
    private backbuffer: ImageData;
    private workingCanvas: HTMLCanvasElement;
    private workingContext: CanvasRenderingContext2D;
    private workingWidth: number;
    private workingHeight: number;
    private backbufferdata;
    private depthbuffer: number[];

    constructor(canvas: HTMLCanvasElement) {
      this.workingCanvas = canvas;
      this.workingWidth = canvas.width;
      this.workingHeight = canvas.height;
      this.workingContext = this.workingCanvas.getContext("2d")!;
      this.depthbuffer = new Array(this.workingWidth * this.workingHeight);
    }

    public clear(): void {
      this.workingContext.clearRect(
        0,
        0,
        this.workingWidth,
        this.workingHeight
      );
      this.backbuffer = this.workingContext.getImageData(
        0,
        0,
        this.workingWidth,
        this.workingHeight
      );

      for (let i = 0; i < this.depthbuffer.length; i++) {
        this.depthbuffer[i] = 10000000;
      }
    }

    public present(): void {
      this.workingContext.putImageData(this.backbuffer, 0, 0);
    }

    public putPixel(
      x: number,
      y: number,
      z: number,
      color: BABYLON.Color4
    ): void {
      this.backbufferdata = this.backbuffer.data;
      let index: number = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;
      //   console.log("putting pixel")
      if (this.depthbuffer[index] < z) {
        return;
      }
      this.depthbuffer[index] = z;

      this.backbufferdata[index] = color.r * 255;
      this.backbufferdata[index + 1] = color.g * 255;
      this.backbufferdata[index + 2] = color.b * 255;
      this.backbufferdata[index + 3] = color.a * 255;
    }

    public project(
      vertex: Vertex,
      transMat: BABYLON.Matrix,
      world: BABYLON.Matrix
    ): Vertex {
      let point2d = BABYLON.Vector3.TransformCoordinates(
        vertex.Coordinates,
        transMat
      );

      let point3dWorld = BABYLON.Vector3.TransformCoordinates(
        vertex.Coordinates,
        world
      );

      let normal3dWorld = BABYLON.Vector3.TransformCoordinates(
        vertex.Normal,
        world
      );

      let x = (point2d.x * this.workingWidth + this.workingWidth / 2.0) >> 0;
      var y = (-point2d.y * this.workingHeight + this.workingHeight / 2.0) >> 0;

      return {
        Coordinates: new BABYLON.Vector3(x, y, point2d.z),
        WorldCoordinates: point3dWorld,
        Normal: normal3dWorld,
      };
    }

    public drawPoint(point: BABYLON.Vector3, color: BABYLON.Color4): void {
      if (
        point.x >= 0 &&
        point.y >= 0 &&
        point.x < this.workingWidth &&
        point.y < this.workingHeight
      ) {
        this.putPixel(point.x, point.y, point.z, color);
      }
    }

    public clamp(value: number, min: number = 0, max: number = 1): number {
      return Math.max(min, Math.min(value, max));
    }

    public interpolate(min: number, max: number, gradient: number) {
      return min + (max - min) * this.clamp(gradient);
    }

    public processScanLine(
      data: ScanLineData,
      va: Vertex,
      vb: Vertex,
      vc: Vertex,
      vd: Vertex,
      color: BABYLON.Color4
    ): void {
      let pa = va.Coordinates;
      let pb = vb.Coordinates;
      let pc = vc.Coordinates;
      let pd = vd.Coordinates;

      let gradient1 =
        pa.y != pb.y ? (data.currentY! - pa.y) / (pb.y - pa.y) : 1;
      let gradient2 =
        pc.y != pd.y ? (data.currentY! - pc.y) / (pd.y - pc.y) : 1;

      let sx = this.interpolate(pa.x, pb.x, gradient1) >> 0; //starting x
      let ex = this.interpolate(pc.x, pd.x, gradient2) >> 0; //ending x

      let z1: number = this.interpolate(pa.z, pb.z, gradient1);
      let z2: number = this.interpolate(pc.z, pd.z, gradient2);

      let snl = this.interpolate(data.ndotla, data.ndotlb!, gradient1);
      let enl = this.interpolate(data.ndotlc, data.ndotld!, gradient2);

      for (let x = sx; x < ex; x++) {
        let gradient: number = (x - sx) / (ex - sx);
        let z = this.interpolate(z1, z2, gradient);
        let ndotl = this.interpolate(snl, enl, gradient);
        this.drawPoint(
          new BABYLON.Vector3(x, data.currentY!, z),
          new BABYLON.Color4(
            color.r * ndotl!,
            color.g * ndotl!,
            color.b * ndotl!,
            1
          )
        );
      }
    }

    public computeNDotL(
      vertex: BABYLON.Vector3,
      normal: BABYLON.Vector3,
      lightPosition: BABYLON.Vector3
    ) {
      let lightDir = lightPosition.subtract(vertex);
      normal.normalize();
      lightDir.normalize()
      return Math.max(0, BABYLON.Vector3.Dot(normal, lightDir));
    }

    public drawTriangle(
      v1: Vertex,
      v2: Vertex,
      v3: Vertex,
      color: BABYLON.Color4
    ): void {
      if (v1.Coordinates.y > v2.Coordinates.y) {
        var temp = v2;
        v2 = v1;
        v1 = temp;
      }

      if (v2.Coordinates.y > v3.Coordinates.y) {
        var temp = v2;
        v2 = v3;
        v3 = temp;
      }

      if (v1.Coordinates.y > v2.Coordinates.y) {
        var temp = v2;
        v2 = v1;
        v1 = temp;
      }

      let p1 = v1.Coordinates;
      let p2 = v2.Coordinates;
      let p3 = v3.Coordinates;

      // let vnFace = v1.Normal.add(v2.Normal.add(v3.Normal)).scale(1 / 3);

      // let centerPoint = v1.WorldCoordinates?.add(
      //   v2.WorldCoordinates?.add(v3.WorldCoordinates)
      // )?.scale(1 / 3);

      let lightPos = new BABYLON.Vector3(0, -30, 50);

      let nl1 = this.computeNDotL(v1.WorldCoordinates, v1.Normal, lightPos);
      let nl2 = this.computeNDotL(v2.WorldCoordinates, v2.Normal, lightPos);
      let nl3 = this.computeNDotL(v3.WorldCoordinates, v3.Normal, lightPos);

      let data: ScanLineData = {};

      let dP1P2: number;
      let dP1P3: number;

      if (p2.y - p1.y > 0) {
        dP1P2 = (p2.x - p1.x) / (p2.y - p1.y);
      } else dP1P2 = 0;

      if (p3.y - p1.y > 0) {
        dP1P3 = (p3.x - p1.x) / (p3.y - p1.y);
      } else dP1P3 = 0;

      if (dP1P2 > dP1P3) {
        for (let y = p1.y >> 0; y <= p3.y >> 0; y++) {
          data.currentY = y;

          if (y < p2.y) {
            data.ndotla = nl1;
            data.ndotlb = nl3;
            data.ndotlc = nl1;
            data.ndotld = nl2;
            this.processScanLine(data, v1, v3, v1, v2, color);
          } else {
            data.ndotla = nl1;
            data.ndotlb = nl3;
            data.ndotlc = nl2;
            data.ndotld = nl3;
            this.processScanLine(data, v1, v3, v2, v3, color);
          }
        }
      } else {
        for (let y = p1.y >> 0; y <= p3.y >> 0; y++) {
          data.currentY = y;

          if (y < p2.y) {
            data.ndotla = nl1;
            data.ndotlb = nl2;
            data.ndotlc = nl1;
            data.ndotld = nl3;
            this.processScanLine(data, v1, v2, v1, v3, color);
          } else {
            data.ndotla = nl2;
            data.ndotlb = nl3;
            data.ndotlc = nl1;
            data.ndotld = nl3;
            this.processScanLine(data, v2, v3, v1, v3, color);
          }
        }
      }
    }

    // public drawBLine(point0: BABYLON.Vector2, point1: BABYLON.Vector2): void {
    //   let x0 = point0.x >> 0;
    //   let y0 = point0.y >> 0;
    //   let x1 = point1.x >> 0;
    //   let y1 = point1.y >> 0;
    //   let dx = Math.abs(x1 - x0);
    //   let dy = Math.abs(y1 - y0);
    //   let sx = x0 < x1 ? 1 : -1;
    //   let sy = y0 < y1 ? 1 : -1;
    //   let err = dx - dy;

    //   while (true) {
    //     this.drawPoint(new BABYLON.Vector2(x0, y0), new BABYLON.Color4(0,1,0,1));
    //     if (x0 == x1 && y0 == y1) break;
    //     let e2 = 2 * err;
    //     if (e2 > -dy) {
    //       err -= dy;
    //       x0 += sx;
    //     }
    //     if (e2 < dx) {
    //       err += dx;
    //       y0 += sy;
    //     }
    //   }
    // }

    public render(camera: Camera, meshes: Mesh[]) {
      let viewMat = BABYLON.Matrix.LookAtLH(
        camera.Position,
        camera.Target,
        BABYLON.Vector3.Up()
      );
      let projectionMat = BABYLON.Matrix.PerspectiveFovLH(
        0.78,
        this.workingWidth / this.workingHeight,
        0.01,
        1.0
      );

      for (let i = 0; i < meshes.length; i++) {
        let cMesh = meshes[i];
        let worldMat = BABYLON.Matrix.RotationYawPitchRoll(
          cMesh.Rotation.y,
          cMesh.Rotation.x,
          cMesh.Rotation.z
        ).multiply(
          BABYLON.Matrix.Translation(
            cMesh.Position.x,
            cMesh.Position.y,
            cMesh.Position.z
          )
        );

        let transformMat = worldMat.multiply(viewMat).multiply(projectionMat);
        // console.log(cMesh)
        for (let j = 0; j < cMesh.Faces.length; j++) {
          let currentFace = cMesh.Faces[j];
          let vertexA = cMesh.Vertices[currentFace.A];
          let vertexB = cMesh.Vertices[currentFace.B];
          let vertexC = cMesh.Vertices[currentFace.C];

          let pixelA = this.project(vertexA, transformMat, worldMat);
          let pixelB = this.project(vertexB, transformMat, worldMat);
          let pixelC = this.project(vertexC, transformMat, worldMat);
          // let color: number =
          //   0.25 + ((j % cMesh.Faces.length) / cMesh.Faces.length) * 0.75;

          let color = 1.0
          this.drawTriangle(
            pixelA,
            pixelB,
            pixelC,
            new BABYLON.Color4(color, color, color, 1)
          );
          // this.drawBLine(pixelB, pixelC);
          // this.drawBLine(pixelC, pixelA);
        }
      }
    }

    public LoadJSONFileAsync(
      filename: string,
      callback: (result: Mesh[]) => any
    ): void {
      let jsonObject = {};
      let xmlhttp = new XMLHttpRequest();
      xmlhttp.open("GET", filename, true);
      let that = this;
      xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
          jsonObject = JSON.parse(xmlhttp.responseText);
          callback(that.CreateMeshesFromJSON(jsonObject));
        }
      };
      xmlhttp.send(null);
    }

    private CreateMeshesFromJSON(jsonObject): Mesh[] {
      let meshes: Mesh[] = [];
      for (let meshI = 0; meshI < jsonObject.meshes.length; meshI++) {
        let verticesArr: number[] = jsonObject.meshes[meshI].positions
          ? jsonObject.meshes[meshI].positions
          : [];
        let indicesArr: number[] = jsonObject.meshes[meshI].indices
          ? jsonObject.meshes[meshI].indices
          : [];
        let uvArr: number[] = jsonObject.meshes[meshI].uvs
          ? jsonObject.meshes[meshI].uvs
          : [];
        let verticesStep = 3;

        // console.log(verticesArr);

        let vertexCount = verticesArr.length / verticesStep;
        let faceCount = indicesArr.length / 3;
        let mesh = new SoftEngine.Mesh(
          jsonObject.meshes[meshI].name,
          vertexCount,
          faceCount
        );

        for (let i = 0; i < vertexCount; i++) {
          let x = verticesArr[i * verticesStep];
          let y = verticesArr[i * verticesStep + 1];
          let z = verticesArr[i * verticesStep + 2];

          let nx = verticesArr[i * verticesStep + 3];
          let ny = verticesArr[i * verticesStep + 4];
          let nz = verticesArr[i * verticesStep + 5];

          mesh.Vertices[i] = {
            Coordinates: new BABYLON.Vector3(x, y, z),
            Normal: new BABYLON.Vector3(nx, ny, nz),
            WorldCoordinates: null,
          };
        }

        for (let i = 0; i < faceCount; i++) {
          let A = indicesArr[i * 3];
          let B = indicesArr[i * 3 + 1];
          let C = indicesArr[i * 3 + 2];

          mesh.Faces[i] = {
            A,
            B,
            C,
          };
        }

        for (let i = 0; i < vertexCount; i++) {
          var u = uvArr[i * 2];
          var v = uvArr[i * 2 + 1];
          mesh.UVs[i] = new BABYLON.Vector2(u, v);
        }

        let position = jsonObject.meshes[meshI].position;
        mesh.Position = new BABYLON.Vector3(
          position[0],
          position[1],
          position[2]
        );
        meshes.push(mesh);
      }
      return meshes;
    }
  }
}