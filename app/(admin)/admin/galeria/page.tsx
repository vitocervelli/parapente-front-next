import { redirect } from "next/navigation";
import { GalleryEditor } from "./GalleryEditor";
import { listGalleryPhotos, UnauthorizedError } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function GaleriaAdminPage() {
  await requireAdmin();

  let photos;
  try {
    photos = await listGalleryPhotos();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Galería</h1>
          <p className="adm-sub">
            Las fotos de la página /galeria. Las «destacadas» salen grandes arriba como polaroids;
            el resto desfila en la tira inferior.
          </p>
        </div>
      </div>
      <GalleryEditor photos={photos} />
    </>
  );
}
