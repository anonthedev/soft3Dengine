///<reference path="babylon.math.ts"/>

module SoftEngine {
  export interface Face {
    A: number;
    B: number;
    C: number;
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
    Vertices: BABYLON.Vector3[];
    UVs: BABYLON.Vector2[];
    Faces: Face[];

    constructor(public name: string, verticesCount: number, faceCount: number) {
      this.Vertices = new Array(verticesCount);
      this.Faces = new Array(faceCount);
      this.Rotation = BABYLON.Vector3.Zero();
      this.Position = BABYLON.Vector3.Zero();
      this.UVs = new Array(verticesCount)
    }
  }

  export class Device {
    private backbuffer: ImageData;
    private workingCanvas: HTMLCanvasElement;
    private workingContext: CanvasRenderingContext2D;
    private workingWidth: number;
    private workingHeight: number;
    private backbufferdata;

    constructor(canvas: HTMLCanvasElement) {
      this.workingCanvas = canvas;
      this.workingWidth = canvas.width;
      this.workingHeight = canvas.height;
      this.workingContext = this.workingCanvas.getContext("2d")!;
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
    }

    public present(): void {
      this.workingContext.putImageData(this.backbuffer, 0, 0);
    }

    public putPixel(x: number, y: number, color: BABYLON.Color4): void {
      this.backbufferdata = this.backbuffer.data;
      let index: number = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;
      //   console.log("putting pixel")

      this.backbufferdata[index] = color.r * 255;
      this.backbufferdata[index + 1] = color.g * 255;
      this.backbufferdata[index + 2] = color.b * 255;
      this.backbufferdata[index + 3] = color.a * 255;
    }

    public project(
      coord: BABYLON.Vector3,
      transMat: BABYLON.Matrix
    ): BABYLON.Vector2 {
      let point = BABYLON.Vector3.TransformCoordinates(coord, transMat);

      let x = (point.x * this.workingWidth + this.workingWidth / 2.0) >> 0;
      var y = (-point.y * this.workingHeight + this.workingHeight / 2.0) >> 0;

      return new BABYLON.Vector2(x, y);
    }

    public drawPoint(point: BABYLON.Vector2): void {
      if (
        point.x >= 0 &&
        point.y >= 0 &&
        point.x < this.workingWidth &&
        point.y < this.workingHeight
      ) {
        this.putPixel(point.x, point.y, new BABYLON.Color4(1, 1, 0, 1));
      }
    }

    public drawBLine(point0: BABYLON.Vector2, point1: BABYLON.Vector2): void {
      let x0 = point0.x >> 0;
      let y0 = point0.y >> 0;
      let x1 = point1.x >> 0;
      let y1 = point1.y >> 0;
      let dx = Math.abs(x1 - x0);
      let dy = Math.abs(y1 - y0);
      let sx = x0 < x1 ? 1 : -1;
      let sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;

      while (true) {
        this.drawPoint(new BABYLON.Vector2(x0, y0));
        if (x0 == x1 && y0 == y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x0 += sx;
        }
        if (e2 < dx) {
          err += dx;
          y0 += sy;
        }
      }
    }

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

          let pixelA = this.project(vertexA, transformMat);
          let pixelB = this.project(vertexB, transformMat);
          let pixelC = this.project(vertexC, transformMat);

          this.drawBLine(pixelA, pixelB);
          this.drawBLine(pixelB, pixelC);
          this.drawBLine(pixelC, pixelA);
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
      // console.log(jsonObject);
      for (let meshI = 0; meshI < jsonObject.meshes.length; meshI++) {
        let verticesArr: number[] = jsonObject.meshes[meshI].positions;
        let indicesArr: number[] = jsonObject.meshes[meshI].indices;
        let uvCount: number = jsonObject.meshes[meshI].uvs.length / 2;
        let uvArr: number[] = jsonObject.meshes[meshI].uvs;
        let verticesStep = 3;
        // console.log(jsonObject.meshes[meshI].positions.len)
        // switch (uvCount) {
        //   case 0:
        //     verticesStep = 6;
        //     break;
        //   case 1:
        //     verticesStep = 8;
        //     break;
        //   case 2:
        //     verticesStep = 10;
        //     break;
        // }

        console.log(verticesArr);

        let vertexCount = verticesArr.length / verticesStep;
        let faceCount = indicesArr.length / 3;
        let mesh = new SoftEngine.Mesh(
          jsonObject.meshes[meshI].name,
          vertexCount,
          faceCount
        );

        for (let i = 0; i < vertexCount; i++) {
          var x = verticesArr[i * verticesStep];
          var y = verticesArr[i * verticesStep + 1];
          var z = verticesArr[i * verticesStep + 2];
          mesh.Vertices[i] = new BABYLON.Vector3(x, y, z);
        }

        for (let i = 0; i < faceCount; i++) {
          let A = indicesArr[i * 3];
          var B = indicesArr[i * 3 + 1];
          var C = indicesArr[i * 3 + 2];

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
        mesh.Position = new BABYLON.Vector3(position[0], position[1], position[2]);
        meshes.push(mesh);
      }
      return meshes;
    }
  }
}
