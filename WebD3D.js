/* WebD3D - a lightweight Canvas 2D 3D software renderer */
(() => {
  "use strict";

  const root = typeof globalThis !== "undefined" ? globalThis : this;

  class Vec3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new Vec3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) { const x = this.y * v.z - this.z * v.y; const y = this.z * v.x - this.x * v.z; const z = this.x * v.y - this.y * v.x; return this.set(x, y, z); }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  }

  class Color {
    constructor(r = 255, g = 255, b = 255, a = 1) { this.r = r; this.g = g; this.b = b; this.a = a; }
    clone() { return new Color(this.r, this.g, this.b, this.a); }
    toCSS() { return `rgba(${this.r | 0},${this.g | 0},${this.b | 0},${this.a})`; }
  }

  class Matrix4 {
    constructor() { this.elements = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
    clone() { const m = new Matrix4(); m.elements.set(this.elements); return m; }
    identity() { this.elements.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); return this; }
    multiply(m) {
      const a = this.elements, b = m.elements, o = new Float32Array(16);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
        o[col * 4 + row] = a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] + a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3];
      }
      this.elements.set(o); return this;
    }
    translate(v) { const m = new Matrix4(); m.elements.set([1,0,0,0, 0,1,0,0, 0,0,1,0, v.x,v.y,v.z,1]); return this.multiply(m); }
    scale(v) { const m = new Matrix4(); m.elements.set([v.x,0,0,0, 0,v.y,0,0, 0,0,v.z,0, 0,0,0,1]); return this.multiply(m); }
    rotateX(a) { const c = Math.cos(a), s = Math.sin(a); const m = new Matrix4(); m.elements.set([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); return this.multiply(m); }
    rotateY(a) { const c = Math.cos(a), s = Math.sin(a); const m = new Matrix4(); m.elements.set([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); return this.multiply(m); }
    rotateZ(a) { const c = Math.cos(a), s = Math.sin(a); const m = new Matrix4(); m.elements.set([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); return this.multiply(m); }
    transformPoint(v) {
      const e = this.elements;
      return new Vec3(e[0] * v.x + e[4] * v.y + e[8] * v.z + e[12], e[1] * v.x + e[5] * v.y + e[9] * v.z + e[13], e[2] * v.x + e[6] * v.y + e[10] * v.z + e[14]);
    }
  }

  class Geometry {
    constructor(vertices = [], faces = [], normals = []) { this.vertices = vertices; this.faces = faces; this.normals = normals; }
  }

  class Material {
    constructor(options = {}) {
      this.color = options.color instanceof Color ? options.color : new Color(options.r ?? 255, options.g ?? 255, options.b ?? 255, options.a ?? 1);
      this.wireframe = options.wireframe ?? false;
      this.doubleSided = options.doubleSided ?? false;
    }
  }

  class Mesh {
    constructor(geometry = new Geometry(), material = new Material()) {
      this.geometry = geometry; this.material = material;
      this.position = new Vec3(); this.rotation = new Vec3(); this.scale = new Vec3(1, 1, 1);
      this.visible = true;
    }
    getMatrix() {
      const m = new Matrix4();
      m.translate(this.position).rotateY(this.rotation.y).rotateX(this.rotation.x).rotateZ(this.rotation.z).scale(this.scale);
      return m;
    }
  }

  class Scene {
    constructor() { this.children = []; this.background = "#10131a"; }
    add(mesh) { this.children.push(mesh); return mesh; }
    remove(mesh) { const i = this.children.indexOf(mesh); if (i >= 0) this.children.splice(i, 1); }
  }

  class Camera {
    constructor() { this.position = new Vec3(0, 0, 0); this.rotation = new Vec3(); this.fov = Math.PI / 3; this.near = 0.1; this.far = 1000; }
  }

  const Primitives = {
    createCube(size = 1) {
      const h = size / 2;
      const vertices = [new Vec3(-h,-h,-h),new Vec3(h,-h,-h),new Vec3(h,h,-h),new Vec3(-h,h,-h),new Vec3(-h,-h,h),new Vec3(h,-h,h),new Vec3(h,h,h),new Vec3(-h,h,h)];
      const faces = [[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[3,2,6],[3,6,7],[1,5,6],[1,6,2],[0,3,7],[0,7,4]];
      return new Geometry(vertices, faces);
    },
    createPlane(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
      const vertices = [], faces = [];
      for (let y = 0; y <= heightSegments; y++) for (let x = 0; x <= widthSegments; x++) vertices.push(new Vec3((x / widthSegments - 0.5) * width, (0.5 - y / heightSegments) * height, 0));
      for (let y = 0; y < heightSegments; y++) for (let x = 0; x < widthSegments; x++) {
        const a = y * (widthSegments + 1) + x, b = a + 1, c = a + widthSegments + 1, d = c + 1;
        faces.push([a,c,b],[b,c,d]);
      }
      return new Geometry(vertices, faces);
    },
    createSphere(radius = 1, widthSegments = 16, heightSegments = 12) {
      const vertices = [], faces = [];
      for (let y = 0; y <= heightSegments; y++) {
        const v = y / heightSegments, phi = v * Math.PI;
        for (let x = 0; x <= widthSegments; x++) {
          const u = x / widthSegments, theta = u * Math.PI * 2;
          vertices.push(new Vec3(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)));
        }
      }
      for (let y = 0; y < heightSegments; y++) for (let x = 0; x < widthSegments; x++) {
        const a = y * (widthSegments + 1) + x, b = a + widthSegments + 1;
        faces.push([a,b,a+1],[b,b+1,a+1]);
      }
      return new Geometry(vertices, faces);
    }
  };

  class Renderer {
    constructor(canvas, options = {}) {
      if (!canvas || !canvas.getContext) throw new Error("WebD3D requires a canvas element");
      this.canvas = canvas; this.ctx = canvas.getContext("2d");
      this.camera = options.camera || new Camera();
      this.light = options.light || new Vec3(-0.5, 0.8, 1).normalize();
      this.ambient = options.ambient ?? 0.25;
      this.wireframe = options.wireframe ?? false;
      this.backfaceCulling = options.backfaceCulling ?? true;
      this.background = options.background ?? "#10131a";
      this.autoResize = options.autoResize ?? true;
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      this.resize();
      if (this.autoResize) window.addEventListener("resize", () => this.resize());
    }
    resize(width, height) {
      if (width == null) width = this.canvas.clientWidth || 640;
      if (height == null) height = this.canvas.clientHeight || 480;
      this.canvas.width = Math.floor(width * this.pixelRatio);
      this.canvas.height = Math.floor(height * this.pixelRatio);
      this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
      this.width = width; this.height = height;
    }
    project(v) {
      const camera = this.camera;
      let p = v.clone().sub(camera.position);
      const rx = camera.rotation.x, ry = camera.rotation.y, rz = camera.rotation.z;
      let x = p.x, y = p.y, z = p.z;
      let cy = Math.cos(-ry), sy = Math.sin(-ry); [x,z] = [cy*x+sy*z,-sy*x+cy*z];
      let cx = Math.cos(-rx), sx = Math.sin(-rx); [y,z] = [cx*y-sx*z,sx*y+cx*z];
      p.set(x,y,z);
      if (p.z <= camera.near) return null;
      const scale = (this.height * 0.5) / Math.tan(camera.fov * 0.5);
      return new Vec3(this.width * 0.5 + p.x * scale / p.z, this.height * 0.5 - p.y * scale / p.z, p.z);
    }
    render(scene) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.fillStyle = scene.background || this.background;
      ctx.fillRect(0, 0, this.width, this.height);
      const triangles = [];
      for (const mesh of scene.children) {
        if (!mesh.visible) continue;
        const m = mesh.getMatrix();
        for (const face of mesh.geometry.faces) {
          const pts = face.map(i => m.transformPoint(mesh.geometry.vertices[i])).filter(Boolean);
          if (pts.length !== 3) continue;
          const projected = pts.map(p => this.project(p));
          if (projected.some(p => !p)) continue;
          const a = pts[0], b = pts[1], c = pts[2];
          const ab = b.clone().sub(a), ac = c.clone().sub(a);
          const normal = ab.cross(ac).normalize();
          const view = this.camera.position.clone().sub(a).normalize();
          if (this.backfaceCulling && !mesh.material.doubleSided && normal.dot(view) <= 0) continue;
          const depth = (projected[0].z + projected[1].z + projected[2].z) / 3;
          const diffuse = Math.max(this.ambient, normal.dot(this.light));
          triangles.push({ projected, depth, normal, diffuse, material: mesh.material });
        }
      }
      triangles.sort((a,b) => b.depth - a.depth);
      for (const tri of triangles) this.drawTriangle(tri);
    }
    drawTriangle(tri) {
      const ctx = this.ctx, p = tri.projected, m = tri.material;
      ctx.beginPath(); ctx.moveTo(p[0].x,p[0].y); ctx.lineTo(p[1].x,p[1].y); ctx.lineTo(p[2].x,p[2].y); ctx.closePath();
      if (m.wireframe || this.wireframe) { ctx.strokeStyle = m.color.toCSS(); ctx.stroke(); return; }
      const c = m.color;
      ctx.fillStyle = `rgba(${Math.min(255,c.r*tri.diffuse)|0},${Math.min(255,c.g*tri.diffuse)|0},${Math.min(255,c.b*tri.diffuse)|0},${c.a})`;
      ctx.fill();
    }
  }

  const WebD3D = { Vec3, Color, Matrix4, Geometry, Material, Mesh, Scene, Camera, Renderer, Primitives };
  if (typeof module !== "undefined" && module.exports) module.exports = WebD3D;
  root.WebD3D = WebD3D;
})();
