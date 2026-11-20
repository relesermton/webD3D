# webD3D

webD3D is a lightweight, browser-based 3D rendering library implemented entirely with the Canvas 2D API. It has no WebGPU, WebGL, or external runtime dependencies.

## Features

- Software 3D projection
- Vertex and face mesh rendering
- Matrix helpers for translation, rotation, and scaling
- Directional and ambient lighting
- Depth sorting
- Wireframe and filled triangle modes
- Back-face culling
- Custom camera controls
- Multiple render passes

## Quick start

```html
<script src="WebD3D.js"></script>
<canvas id="canvas"></canvas>

<script>
const canvas = document.getElementById("canvas");
const renderer = new WebD3D.Renderer(canvas);
const scene = new WebD3D.Scene();

const cube = new WebD3D.Mesh(
  WebD3D.Primitives.createCube()
);
cube.position.set(0, 0, 4);
scene.add(cube);

function frame() {
  cube.rotation.y += 0.01;
  renderer.render(scene);
  requestAnimationFrame(frame);
}

frame();
</script>
```

Open `playground/index.html` in a browser, or serve the repository with a local HTTP server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080/playground/`.

## API

- `new WebD3D.Renderer(canvas, options)` — create a software renderer
- `new WebD3D.Scene()` — create a scene
- `scene.add(mesh)` — add a mesh
- `new WebD3D.Mesh(geometry, material)` — create a mesh
- `WebD3D.Vec3`, `WebD3D.Color`, `WebD3D.Matrix4`
- `WebD3D.Primitives.createCube(size)` — create a cuboid mesh geometry
- `WebD3D.Primitives.createSphere(radius, widthSegments, heightSegments)`
- `WebD3D.Primitives.createPlane(width, height, widthSegments, heightSegments)`

## Browser support

Any modern browser with Canvas 2D support is sufficient. WebGPU and WebGL are not used.

## License

AGPL-3.0. See `LICENSE`.
