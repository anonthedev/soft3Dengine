///<reference path="SoftEngine.ts"/>
var canvas;
var device;
var mesh;
var meshes = [];
var camera;
document.addEventListener("DOMContentLoaded", main, false);
function main() {
    canvas = document.getElementById("canvas");
    camera = new SoftEngine.Camera();
    device = new SoftEngine.Device(canvas);
    camera.Position = new BABYLON.Vector3(0, 0, 10);
    camera.Target = new BABYLON.Vector3(0, 0, 0);
    // console.log(camera)
    device.LoadJSONFileAsync("monkey.babylon", loadJSONCompleted);
    requestAnimationFrame(drawingLoop);
}
function loadJSONCompleted(meshesLoaded) {
    meshes = meshesLoaded;
    requestAnimationFrame(drawingLoop);
}
function drawingLoop() {
    device.clear();
    for (var i = 0; i < meshes.length; i++) {
        // meshes[i].Rotation.x += 0.01;
        meshes[i].Rotation.y += 0.01;
    }
    device.render(camera, meshes);
    device.present();
    requestAnimationFrame(drawingLoop);
}
