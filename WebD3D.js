/* WebD3D - a lightweight Canvas 2D 3D software renderer */
(() => {
  "use strict";
  const root = typeof globalThis !== "undefined" ? globalThis : this;

  class Vec3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new Vec3(this.x, this.y, this.z); }
    copy(v) { return this.set(v.x, v.y, v.z); }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) { const x = this.y * v.z - this.z * v.y, y = this.z * v.x - this.x * v.z, z = this.x * v.y - this.y * v.x; return this.set(x, y, z); }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() { const n = this.length() || 1; return this.multiplyScalar(1 / n); }
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
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      this.elements.set(o); return this;
    }
    translate(v) { const m = new Matrix4(); m.elements.set([1,0,0,0, 0,1,0,0, 0,0,1,0, v.x,v.y,v.z,1]); return this.multiply(m); }
    scale(v) { const m = new Matrix4(); m.elements.set([v.x,0,0,0, 0,v.y,0,0, 0,0,v.z,0, 0,0,0,1]); return this.multiply(m); }
    rotateX(a) { const c = Math.cos(a), s = Math.sin(a), m = new Matrix4(); m.elements.set([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); return this.multiply(m); }
    rotateY(a) { const c = Math.cos(a), s = Math.sin(a), m = new Matrix4(); m.elements.set([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); return this.multiply(m); }
    rotateZ(a) { const c = Math.cos(a), s = Math.sin(a), m = new Matrix4(); m.elements.set([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); return this.multiply(m); }
    transformPoint(v) { const e = this.elements; return new Vec3(e[0]*v.x+e[4]*v.y+e[8]*v.z+e[12], e[1]*v.x+e[5]*v.y+e[9]*v.z+e[13], e[2]*v.x+e[6]*v.y+e[10]*v.z+e[14]); }
  }

  class Geometry { constructor(vertices = [], faces = [], normals = []) { this.vertices = vertices; this.faces = faces; this.normals = normals; } }
  class Material {
    constructor(options = {}) {
      this.color = options.color instanceof Color ? options.color : new Color(options.r ?? 255, options.g ?? 255, options.b ?? 255, options.a ?? 1);
      this.wireframe = options.wireframe ?? false; this.doubleSided = options.doubleSided ?? false;
    }
  }
  class Mesh {
    constructor(geometry = new Geometry(), material = new Material()) { this.geometry = geometry; this.material = material; this.position = new Vec3(); this.rotation = new Vec3(); this.scale = new Vec3(1,1,1); this.visible = true; }
    getMatrix() { return new Matrix4().translate(this.position).rotateY(this.rotation.y).rotateX(this.rotation.x).rotateZ(this.rotation.z).scale(this.scale); }
  }
  class Scene {
    constructor() { this.children = []; this.background = "#10131a"; }
    add(mesh) { this.children.push(mesh); return mesh; }
    remove(mesh) { const i = this.children.indexOf(mesh); if (i !== -1) this.children.splice(i, 1); }
  }
  class Camera { constructor() { this.position = new Vec3(); this.rotation = new Vec3(); this.fov = Math.PI/3; this.near = 0.1; this.far = 1000; } }

  const Primitives = {
    createCube(size = 1) {
      const h = size / 2;
      const vertices = [new Vec3(-h,-h,-h),new Vec3(h,-h,-h),new Vec3(h,h,-h),new Vec3(-h,h,-h),new Vec3(-h,-h,h),new Vec3(h,-h,h),new Vec3(h,h,h),new Vec3(-h,h,h)];
      // Faces are wound outward so front-face culling keeps the visible surfaces.
      const faces = [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,5,4],[0,1,5],[3,6,2],[3,7,6],[1,6,5],[1,2,6],[0,7,3],[0,4,7]];
      return new Geometry(vertices, faces);
    },
    createPlane(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
      widthSegments = Math.max(1, Math.floor(widthSegments)); heightSegments = Math.max(1, Math.floor(heightSegments));
      const vertices = [], faces = [];
      for (let y=0; y<=heightSegments; y++) for (let x=0; x<=widthSegments; x++) vertices.push(new Vec3((x/widthSegments-0.5)*width,(0.5-y/heightSegments)*height,0));
      for (let y=0; y<heightSegments; y++) for (let x=0; x<widthSegments; x++) { const a=y*(widthSegments+1)+x, b=a+1, c=a+widthSegments+1, d=c+1; faces.push([a,b,c],[b,d,c]); }
      return new Geometry(vertices, faces);
    },
    createSphere(radius = 1, widthSegments = 16, heightSegments = 12) {
      widthSegments=Math.max(3,Math.floor(widthSegments)); heightSegments=Math.max(2,Math.floor(heightSegments));
      const vertices=[], faces=[];
      for (let y=0; y<=heightSegments; y++) { const phi=y/heightSegments*Math.PI; for (let x=0; x<=widthSegments; x++) { const theta=x/widthSegments*Math.PI*2; vertices.push(new Vec3(radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta))); } }
      for (let y=0; y<heightSegments; y++) for (let x=0; x<widthSegments; x++) { const a=y*(widthSegments+1)+x, b=a+widthSegments+1; faces.push([a,a+1,b],[a+1,b+1,b]); }
      return new Geometry(vertices, faces);
    }
  };

  class Renderer {
    constructor(canvas, options = {}) {
      if (!canvas || typeof canvas.getContext !== "function") throw new Error("WebD3D requires a canvas element");
      this.canvas=canvas; this.ctx=canvas.getContext("2d");
      if (!this.ctx) throw new Error("WebD3D could not create a Canvas 2D context");
      this.camera=options.camera || new Camera(); this.light=(options.light || new Vec3(-0.5,0.8,1)).clone().normalize();
      this.ambient=options.ambient ?? 0.25; this.wireframe=options.wireframe ?? false; this.backfaceCulling=options.backfaceCulling ?? true;
      this.background=options.background ?? "#10131a"; this.autoResize=options.autoResize ?? true;
      this.pixelRatio=Math.min((typeof window !== "undefined" && window.devicePixelRatio) || 1,2);
      this.resize();
      if (this.autoResize && typeof window !== "undefined') window.addEventListener("resize", () => this.resize());
    }
    resize(width, height) {
      if (width == null) width=this.canvas.clientWidth || 640; if (height == null) height=this.canvas.clientHeight || 480;
      this.width=Math.max(1,width); this.height=Math.max(1,height);
      this.canvas.width=Math.floor(this.width*this.pixelRatio); this.canvas.height=Math.floor(this.height*this.pixelRatio);
      this.ctx.setTransform(this.pixelRatio,0,0,this.pixelRatio,0,0);
    }
    project(v) {
      const camera=this.camera; let p=v.clone().sub(camera.position); let x=p.x,y=p.y,z=p.z;
      const cy=Math.cos(-camera.rotation.y),sy=Math.sin(-camera.rotation.y); [x,z]=[cy*x+sy*z,-sy*x+cy*z];
      const cx=Math.cos(-camera.rotation.x),sx=Math.sin(-camera.rotation.x); [y,z]=[cx*y-sx*z,sx*y+cx*z];
      p.set(x,y,z); if (p.z<=camera.near || p.z>=camera.far) return null;
      const scale=(this.height*0.5)/Math.tan(camera.fov*0.5);
      return new Vec3(this.width*0.5+p.x*scale/p.z,this.height*0.5-p.y*scale/p.z,p.z);
    }
    render(scene) {
      const ctx=this.ctx; ctx.clearRect(0,0,this.width,this.height); ctx.fillStyle=scene.background || this.background; ctx.fillRect(0,0,this.width,this.height);
      const triangles=[];
      for (const mesh of scene.children) {
        if (!mesh.visible || !mesh.geometry || !mesh.material) continue;
        const matrix=mesh.getMatrix();
        for (const face of mesh.geometry.faces) {
          if (!face || face.length!==3 || face.some(i=>!mesh.geometry.vertices[i])) continue;
          const pts=face.map(i=>matrix.transformPoint(mesh.geometry.vertices[i]));
          const projected=pts.map(p=>this.project(p)); if (projected.some(p=>!p)) continue;
          const normal=pts[1].clone().sub(pts[0]).cross(pts[2].clone().sub(pts[0])).normalize();
          const view=this.camera.position.clone().sub(pts[0]).normalize();
          if (this.backfaceCulling && !mesh.material.doubleSided && normal.dot(view)<=0) continue;
          const diffuse=Math.max(this.ambient,normal.dot(this.light));
          triangles.push({projected,depth:(projected[0].z+projected[1].z+projected[2].z)/3,diffuse,material:mesh.material});
        }
      }
      triangles.sort((a,b)=>b.depth-a.depth);
      for (const tri of triangles) this.drawTriangle(tri);
    }
    drawTriangle(tri) {
      const ctx=this.ctx,p=tri.projected,m=tri.material,c=m.color;
      ctx.beginPath(); ctx.moveTo(p[0].x,p[0].y); ctx.lineTo(p[1].x,p[1].y); ctx.lineTo(p[2].x,p[2].y); ctx.closePath();
      if (m.wireframe || this.wireframe) { ctx.strokeStyle=c.toCSS(); ctx.stroke(); return; }
      ctx.fillStyle=`rgba(${Math.max(0,Math.min(255,c.r*tri.diffuse))|0},${Math.max(0,Math.min(255,c.g*tri.diffuse))|0},${Math.max(0,Math.min(255,c.b*tri.diffuse))|0},${c.a})`; ctx.fill();
    }
  }
  const WebD3D={Vec3,Color,Matrix4,Geometry,Material,Mesh,Scene,Camera,Renderer,Primitives};
  if (typeof module!=="undefined" && module.exports) module.exports=WebD3D;
  root.WebD3D=WebD3D;
})();
