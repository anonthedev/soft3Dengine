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
            this.UVs = new Array(verticesCount);
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
                // console.log(cMesh)
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
        Device.prototype.LoadJSONFileAsync = function (filename, callback) {
            var jsonObject = {};
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", filename, true);
            var that = this;
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    jsonObject = JSON.parse(xmlhttp.responseText);
                    callback(that.CreateMeshesFromJSON(jsonObject));
                }
            };
            xmlhttp.send(null);
        };
        Device.prototype.CreateMeshesFromJSON = function (jsonObject) {
            var meshes = [];
            // console.log(jsonObject);
            for (var meshI = 0; meshI < jsonObject.meshes.length; meshI++) {
                var verticesArr = jsonObject.meshes[meshI].positions;
                var indicesArr = jsonObject.meshes[meshI].indices;
                var uvCount = jsonObject.meshes[meshI].uvs.length / 2;
                var uvArr = jsonObject.meshes[meshI].uvs;
                var verticesStep = 3;
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
                var vertexCount = verticesArr.length / verticesStep;
                var faceCount = indicesArr.length / 3;
                var mesh_1 = new SoftEngine.Mesh(jsonObject.meshes[meshI].name, vertexCount, faceCount);
                for (var i = 0; i < vertexCount; i++) {
                    var x = verticesArr[i * verticesStep];
                    var y = verticesArr[i * verticesStep + 1];
                    var z = verticesArr[i * verticesStep + 2];
                    mesh_1.Vertices[i] = new BABYLON.Vector3(x, y, z);
                }
                for (var i = 0; i < faceCount; i++) {
                    var A = indicesArr[i * 3];
                    var B = indicesArr[i * 3 + 1];
                    var C = indicesArr[i * 3 + 2];
                    mesh_1.Faces[i] = {
                        A: A,
                        B: B,
                        C: C,
                    };
                }
                for (var i = 0; i < vertexCount; i++) {
                    var u = uvArr[i * 2];
                    var v = uvArr[i * 2 + 1];
                    mesh_1.UVs[i] = new BABYLON.Vector2(u, v);
                }
                var position = jsonObject.meshes[meshI].position;
                mesh_1.Position = new BABYLON.Vector3(position[0], position[1], position[2]);
                meshes.push(mesh_1);
            }
            return meshes;
        };
        return Device;
    }());
    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}));
