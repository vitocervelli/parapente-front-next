import { redirect } from "next/navigation";
import { ReelsEditor } from "./ReelsEditor";
import { listReels, UnauthorizedError } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function ReelsAdminPage() {
  await requireAdmin();

  let reels;
  try {
    reels = await listReels();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Reels</h1>
          <p className="adm-sub">
            Los vídeos verticales de la sección «Vívelo en movimiento» de la portada. Sube MP4, MOV o
            WebM (hasta 100 MB). Si no hay ninguno activo, la sección no aparece en la web.
          </p>
        </div>
      </div>
      <ReelsEditor reels={reels} />
    </>
  );
}
