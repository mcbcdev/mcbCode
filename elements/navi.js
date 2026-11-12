
try {
  const { LiquidGlass } = await import(
    "https://cdn.jsdelivr.net/npm/@ybouane/liquidglass/dist/index.js"
  );

  const root = document.body;
  const bodyStyle = getComputedStyle(document.body);
  const htmlStyle = getComputedStyle(document.documentElement);

  // LiquidGlass cannot sample the root's own background.
  // Create a background layer inside the root instead.
  const sceneBackground = document.createElement("div");
  sceneBackground.id = "liquidglass-scene-background";

  const bodyHasBackground =
    bodyStyle.backgroundImage !== "none" ||
    bodyStyle.backgroundColor !== "rgba(0, 0, 0, 0)";

  const sourceStyle = bodyHasBackground ? bodyStyle : htmlStyle;

  Object.assign(sceneBackground.style, {
    position: "fixed",
    inset: "0",
    zIndex: "-1",
    pointerEvents: "none",
    backgroundColor:
      sourceStyle.backgroundColor === "rgba(0, 0, 0, 0)"
        ? "#0c0c0c"
        : sourceStyle.backgroundColor,
    backgroundImage: sourceStyle.backgroundImage,
    backgroundSize: sourceStyle.backgroundSize,
    backgroundPosition: sourceStyle.backgroundPosition
  });

  root.style.position = "relative";
  root.insertBefore(sceneBackground, nav);

  nav.dataset.config = JSON.stringify({
    blurAmount: 0.16,
    refraction: 0.24,
    chromAberration: 0.012,
    edgeHighlight: 0.16,
    specular: 0.18,
    fresnel: 0.72,
    distortion: 0.008,
    cornerRadius: 0,
    zRadius: 12,
    opacity: 1,
    saturation: 0.12,
    tintStrength: 0.08,
    brightness: 0.025,
    shadowOpacity: 0.16,
    shadowSpread: 14,
    shadowOffsetY: 3
  });

  window.mcbCodeLiquidGlass = await LiquidGlass.init({
    root,
    glassElements: [nav]
  });

  // Remove the CSS-only blur once WebGL is running.
  nav.style.backdropFilter = "none";
  nav.style.webkitBackdropFilter = "none";

} catch (error) {
  console.warn(
    "LiquidGlass failed; using CSS fallback.",
    error
  );
}
