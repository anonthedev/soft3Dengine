///<reference path="SoftEngine.ts"/>

let canvas: HTMLCanvasElement;
let device: SoftEngine.Device;
let mesh: SoftEngine.Mesh;
let meshes: SoftEngine.Mesh[] = [];
let camera: SoftEngine.Camera;

document.addEventListener("DOMContentLoaded", main, false);

function main() {
  canvas = <HTMLCanvasElement>document.getElementById("canvas");
  mesh = new SoftEngine.Mesh("Cube", 8);
  meshes.push(mesh);
  camera = new SoftEngine.Camera();
  device = new SoftEngine.Device(canvas);

  mesh.Vertices[0] = new BABYLON.Vector3(-1, 1, 1);
  mesh.Vertices[1] = new BABYLON.Vector3(1, 1, 1);
  mesh.Vertices[2] = new BABYLON.Vector3(-1, -1, 1);
  mesh.Vertices[3] = new BABYLON.Vector3(-1, -1, -1);
  mesh.Vertices[4] = new BABYLON.Vector3(-1, 1, -1);
  mesh.Vertices[5] = new BABYLON.Vector3(1, 1, -1);
  mesh.Vertices[6] = new BABYLON.Vector3(1, -1, 1);
  mesh.Vertices[7] = new BABYLON.Vector3(1, -1, -1);

  camera.Position = new BABYLON.Vector3(0, 0, 10);
  camera.Target = new BABYLON.Vector3(0, 0, 0);

  requestAnimationFrame(drawingLoop)
}

function drawingLoop() {
    device.clear()

    mesh.Rotation.x += 0.01
    mesh.Rotation.y += 0.01

    device.render(camera, meshes)
    device.present()

    requestAnimationFrame(drawingLoop)
}