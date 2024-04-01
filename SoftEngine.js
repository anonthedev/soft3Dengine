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
            this.depthbuffer = new Array(this.workingWidth * this.workingHeight);
        }
        Device.prototype.clear = function () {
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
            for (var i = 0; i < this.depthbuffer.length; i++) {
                this.depthbuffer[i] = 10000000;
            }
        };
        Device.prototype.present = function () {
            this.workingContext.putImageData(this.backbuffer, 0, 0);
        };
        Device.prototype.putPixel = function (x, y, z, color) {
            this.backbufferdata = this.backbuffer.data;
            var index = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;
            //   console.log("putting pixel")
            if (this.depthbuffer[index] < z) {
                return;
            }
            this.depthbuffer[index] = z;
            this.backbufferdata[index] = color.r * 255;
            this.backbufferdata[index + 1] = color.g * 255;
            this.backbufferdata[index + 2] = color.b * 255;
            this.backbufferdata[index + 3] = color.a * 255;
        };
        Device.prototype.project = function (vertex, transMat, world) {
            var point2d = BABYLON.Vector3.TransformCoordinates(vertex.Coordinates, transMat);
            var point3dWorld = BABYLON.Vector3.TransformCoordinates(vertex.Coordinates, world);
            var normal3dWorld = BABYLON.Vector3.TransformCoordinates(vertex.Normal, world);
            var x = (point2d.x * this.workingWidth + this.workingWidth / 2.0) >> 0;
            var y = (-point2d.y * this.workingHeight + this.workingHeight / 2.0) >> 0;
            return {
                Coordinates: new BABYLON.Vector3(x, y, point2d.z),
                WorldCoordinates: point3dWorld,
                Normal: normal3dWorld,
            };
        };
        Device.prototype.drawPoint = function (point, color) {
            if (point.x >= 0 &&
                point.y >= 0 &&
                point.x < this.workingWidth &&
                point.y < this.workingHeight) {
                this.putPixel(point.x, point.y, point.z, color);
            }
        };
        Device.prototype.clamp = function (value, min, max) {
            if (min === void 0) { min = 0; }
            if (max === void 0) { max = 1; }
            return Math.max(min, Math.min(value, max));
        };
        Device.prototype.interpolate = function (min, max, gradient) {
            return min + (max - min) * this.clamp(gradient);
        };
        Device.prototype.processScanLine = function (data, va, vb, vc, vd, color) {
            var pa = va.Coordinates;
            var pb = vb.Coordinates;
            var pc = vc.Coordinates;
            var pd = vd.Coordinates;
            var gradient1 = pa.y != pb.y ? (data.currentY - pa.y) / (pb.y - pa.y) : 1;
            var gradient2 = pc.y != pd.y ? (data.currentY - pc.y) / (pd.y - pc.y) : 1;
            var sx = this.interpolate(pa.x, pb.x, gradient1) >> 0; //starting x
            var ex = this.interpolate(pc.x, pd.x, gradient2) >> 0; //ending x
            var z1 = this.interpolate(pa.z, pb.z, gradient1);
            var z2 = this.interpolate(pc.z, pd.z, gradient2);
            var snl = this.interpolate(data.ndotla, data.ndotlb, gradient1);
            var enl = this.interpolate(data.ndotlc, data.ndotld, gradient2);
            for (var x = sx; x < ex; x++) {
                var gradient = (x - sx) / (ex - sx);
                var z = this.interpolate(z1, z2, gradient);
                var ndotl = this.interpolate(snl, enl, gradient);
                this.drawPoint(new BABYLON.Vector3(x, data.currentY, z), new BABYLON.Color4(color.r * ndotl, color.g * ndotl, color.b * ndotl, 1));
            }
        };
        Device.prototype.computeNDotL = function (vertex, normal, lightPosition) {
            var lightDir = lightPosition.subtract(vertex);
            normal.normalize();
            lightDir.normalize();
            return Math.max(0, BABYLON.Vector3.Dot(normal, lightDir));
        };
        Device.prototype.drawTriangle = function (v1, v2, v3, color) {
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
            var p1 = v1.Coordinates;
            var p2 = v2.Coordinates;
            var p3 = v3.Coordinates;
            // let vnFace = v1.Normal.add(v2.Normal.add(v3.Normal)).scale(1 / 3);
            // let centerPoint = v1.WorldCoordinates?.add(
            //   v2.WorldCoordinates?.add(v3.WorldCoordinates)
            // )?.scale(1 / 3);
            var lightPos = new BABYLON.Vector3(0, -30, 50);
            var nl1 = this.computeNDotL(v1.WorldCoordinates, v1.Normal, lightPos);
            var nl2 = this.computeNDotL(v2.WorldCoordinates, v2.Normal, lightPos);
            var nl3 = this.computeNDotL(v3.WorldCoordinates, v3.Normal, lightPos);
            var data = {};
            var dP1P2;
            var dP1P3;
            if (p2.y - p1.y > 0) {
                dP1P2 = (p2.x - p1.x) / (p2.y - p1.y);
            }
            else
                dP1P2 = 0;
            if (p3.y - p1.y > 0) {
                dP1P3 = (p3.x - p1.x) / (p3.y - p1.y);
            }
            else
                dP1P3 = 0;
            if (dP1P2 > dP1P3) {
                for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    data.currentY = y;
                    if (y < p2.y) {
                        data.ndotla = nl1;
                        data.ndotlb = nl3;
                        data.ndotlc = nl1;
                        data.ndotld = nl2;
                        this.processScanLine(data, v1, v3, v1, v2, color);
                    }
                    else {
                        data.ndotla = nl1;
                        data.ndotlb = nl3;
                        data.ndotlc = nl2;
                        data.ndotld = nl3;
                        this.processScanLine(data, v1, v3, v2, v3, color);
                    }
                }
            }
            else {
                for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    data.currentY = y;
                    if (y < p2.y) {
                        data.ndotla = nl1;
                        data.ndotlb = nl2;
                        data.ndotlc = nl1;
                        data.ndotld = nl3;
                        this.processScanLine(data, v1, v2, v1, v3, color);
                    }
                    else {
                        data.ndotla = nl2;
                        data.ndotlb = nl3;
                        data.ndotlc = nl1;
                        data.ndotld = nl3;
                        this.processScanLine(data, v2, v3, v1, v3, color);
                    }
                }
            }
        };
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
                    var pixelA = this.project(vertexA, transformMat, worldMat);
                    var pixelB = this.project(vertexB, transformMat, worldMat);
                    var pixelC = this.project(vertexC, transformMat, worldMat);
                    // let color: number =
                    //   0.25 + ((j % cMesh.Faces.length) / cMesh.Faces.length) * 0.75;
                    var color = 1.0;
                    this.drawTriangle(pixelA, pixelB, pixelC, new BABYLON.Color4(color, color, color, 1));
                    // this.drawBLine(pixelB, pixelC);
                    // this.drawBLine(pixelC, pixelA);
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
            for (var meshI = 0; meshI < jsonObject.meshes.length; meshI++) {
                var verticesArr = jsonObject.meshes[meshI].positions
                    ? jsonObject.meshes[meshI].positions
                    : [];
                var indicesArr = jsonObject.meshes[meshI].indices
                    ? jsonObject.meshes[meshI].indices
                    : [];
                var uvArr = jsonObject.meshes[meshI].uvs
                    ? jsonObject.meshes[meshI].uvs
                    : [];
                var verticesStep = 3;
                // console.log(verticesArr);
                var vertexCount = verticesArr.length / verticesStep;
                var faceCount = indicesArr.length / 3;
                var mesh_1 = new SoftEngine.Mesh(jsonObject.meshes[meshI].name, vertexCount, faceCount);
                for (var i = 0; i < vertexCount; i++) {
                    var x = verticesArr[i * verticesStep];
                    var y = verticesArr[i * verticesStep + 1];
                    var z = verticesArr[i * verticesStep + 2];
                    var nx = verticesArr[i * verticesStep + 3];
                    var ny = verticesArr[i * verticesStep + 4];
                    var nz = verticesArr[i * verticesStep + 5];
                    mesh_1.Vertices[i] = {
                        Coordinates: new BABYLON.Vector3(x, y, z),
                        Normal: new BABYLON.Vector3(nx, ny, nz),
                        WorldCoordinates: null,
                    };
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
