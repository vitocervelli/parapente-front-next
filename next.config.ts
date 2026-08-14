import type { NextConfig } from "next";

// Las fotos de los servicios las sirve Symfony desde /uploads. El patrón se
// deriva de la variable de entorno para que no puedan desincronizarse: para
// next/image "localhost" y "127.0.0.1" son hosts distintos.
const backend = new URL(
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000",
);

// Next 16 bloquea por defecto la optimización de imágenes servidas desde IPs
// privadas (protección SSRF). En local el backend vive en 127.0.0.1, así que
// hay que permitirlo; en producción, con un dominio real, queda desactivado.
const backendIsLocal = ["localhost", "127.0.0.1", "::1"].includes(
  backend.hostname,
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: backend.protocol.replace(":", "") as "http" | "https",
        hostname: backend.hostname,
        port: backend.port,
        pathname: "/uploads/**",
      },
    ],
    dangerouslyAllowLocalIP: backendIsLocal,
  },
};

export default nextConfig;
