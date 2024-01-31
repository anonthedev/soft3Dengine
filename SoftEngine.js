///<reference path="babylon.math.ts"/>
var SoftEngine;
(function (SoftEngine) {
    var Camera = /** @class */ (function () {
        function Camera() {
            this.Position = BABYLON.Vector3.Zero();
            this.Target = BABYLON.Vector3.Zero();
        }
        return Camera;
    }());
    SoftEngine.Camera = Camera;
    var Mesh = /** @class */ (function () {
        function Mesh(name, verticesCount, faceCount) {
            this.name = name;
            this.Vertices = new Array(verticesCount);
            this.Faces = new Array(faceCount);
            this.Rotation = BABYLON.Vector3.Zero();
            this.Position = BABYLON.Vector3.Zero();
        }
        return Mesh;
    }());
    SoftEngine.Mesh = Mesh;
    var Device = /** @class */ (function () {
        function Device(canvas) {
            this.workingCanvas = canvas;
            this.workingWidth = canvas.width;
            this.workingHeight = canvas.height;
            this.workingContext = this.workingCanvas.getContext("2d");
        }
        Device.prototype.clear = function () {
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
        };
        Device.prototype.present = function () {
            this.workingContext.putImageData(this.backbuffer, 0, 0);
        };
        Device.prototype.putPixel = function (x, y, color) {
            this.backbufferdata = this.backbuffer.data;
            var index = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;
            //   console.log("putting pixel")
            this.backbufferdata[index] = color.r * 255;
            this.backbufferdata[index + 1] = color.g * 255;
            this.backbufferdata[index + 2] = color.b * 255;
            this.backbufferdata[index + 3] = color.a * 255;
        };
        Device.prototype.project = function (coord, transMat) {
            var point = BABYLON.Vector3.TransformCoordinates(coord, transMat);
            var x = (point.x * this.workingWidth + this.workingWidth / 2.0) >> 0;
            var y = (-point.y * this.workingHeight + this.workingHeight / 2.0) >> 0;
            return new BABYLON.Vector2(x, y);
        };
        Device.prototype.drawPoint = function (point) {
            if (point.x >= 0 &&
                point.y >= 0 &&
                point.x < this.workingWidth &&
                point.y < this.workingHeight) {
                this.putPixel(point.x, point.y, new BABYLON.Color4(0, 1, 0, 1));
            }
        };
        Device.prototype.drawBLine = function (point0, point1) {
            var x0 = point0.x >> 0;
            var y0 = point0.y >> 0;
            var x1 = point1.x >> 0;
            var y1 = point1.y >> 0;
            var dx = Math.abs(x1 - x0);
            var dy = Math.abs(y1 - y0);
            var sx = x0 < x1 ? 1 : -1;
            var sy = y0 < y1 ? 1 : -1;
            var err = dx - dy;
            while (true) {
                this.drawPoint(new BABYLON.Vector2(x0, y0));
                if (x0 == x1 && y0 == y1)
                    break;
                var e2 = 2 * err;
                if (e2 > -dy) {
                    err -= dy;
                    x0 += sx;
                }
                if (e2 < dx) {
                    err += dx;
                    y0 += sy;
                }
            }
        };
        Device.prototype.render = function (camera, meshes) {
            var viewMat = BABYLON.Matrix.LookAtLH(camera.Position, camera.Target, BABYLON.Vector3.Up());
            var projectionMat = BABYLON.Matrix.PerspectiveFovLH(0.78, this.workingWidth / this.workingHeight, 0.01, 1.0);
            for (var i = 0; i < meshes.length; i++) {
                var cMesh = meshes[i];
                var worldMat = BABYLON.Matrix.RotationYawPitchRoll(cMesh.Rotation.y, cMesh.Rotation.x, cMesh.Rotation.z).multiply(BABYLON.Matrix.Translation(cMesh.Position.x, cMesh.Position.y, cMesh.Position.z));
                var transformMat = worldMat.multiply(viewMat).multiply(projectionMat);
                for (var j = 0; j < cMesh.Faces.length; j++) {
                    var currentFace = cMesh.Faces[j];
                    var vertexA = cMesh.Vertices[currentFace.A];
                    var vertexB = cMesh.Vertices[currentFace.B];
                    var vertexC = cMesh.Vertices[currentFace.C];
                    var pixelA = this.project(vertexA, transformMat);
                    var pixelB = this.project(vertexB, transformMat);
                    var pixelC = this.project(vertexC, transformMat);
                    this.drawBLine(pixelA, pixelB);
                    this.drawBLine(pixelB, pixelC);
                    this.drawBLine(pixelC, pixelA);
                }
            }
        };
        return Device;
    }());
    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}));
