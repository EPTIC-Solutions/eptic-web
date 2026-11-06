import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // "/" renders a different site depending on the hostname (see app/sites.ts)
  index("routes/index.tsx"),
  // banners.eptic.ro/tokyo.png
  route("tokyo.png", "routes/tokyo-png.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
