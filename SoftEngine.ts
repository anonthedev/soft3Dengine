///<reference path="babylon.math.ts"/>

module SoftEngine {
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

    constructor(public name: string, verticesCount: number) {
      this.Vertices = new Array(verticesCount);
      this.Rotation = BABYLON.Vector3.Zero();
      this.Position = BABYLON.Vector3.Zero();
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

      let x = point.x * this.workingWidth + this.workingWidth / 2.0 >> 0;
      var y = -point.y * this.workingHeight + this.workingHeight / 2.0 >> 0;

      return new BABYLON.Vector2(x, y);
    }

    public drawPoint(point: BABYLON.Vector2): void {
      if (
        point.x >= 0 &&
        point.y >= 0 &&
        point.x < this.workingWidth &&
        point.y < this.workingHeight
      ) {
        this.putPixel(point.x, point.y, new BABYLON.Color4(0, 1, 0, 1));
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

        for (let iVertices = 0; iVertices < cMesh.Vertices.length; iVertices++) {
          let projectedPoint = this.project(
            cMesh.Vertices[iVertices],
            transformMat
          );
          this.drawPoint(projectedPoint);
        }
      }
    }
  }
}
