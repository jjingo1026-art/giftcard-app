import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 * Request a presigned URL for file upload.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body ?? {};
  if (!name || !size || !contentType) {
    res.status(400).json({ error: "name, size, contentType 는 필수입니다." });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    console.error("업로드 URL 생성 실패:", error);
    res.status(500).json({ error: "업로드 URL 생성에 실패했습니다." });
  }
});

/**
 * GET /storage/public-objects/:path
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 */
router.get(/^\/storage\/public-objects\/(.+)$/, async (req: Request, res: Response) => {
  const filePath = (req.params as any)[0];
  if (!filePath) {
    res.status(400).json({ error: "파일 경로가 필요합니다." });
    return;
  }

  try {
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "파일을 찾을 수 없습니다." });
      return;
    }
    const response = await objectStorageService.downloadObject(file);
    res.set("Content-Type", response.headers.get("Content-Type") ?? "application/octet-stream");
    res.set("Cache-Control", response.headers.get("Cache-Control") ?? "public, max-age=3600");
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.status(204).end();
    }
  } catch (error) {
    console.error("공개 오브젝트 서빙 실패:", error);
    res.status(500).json({ error: "파일 서빙에 실패했습니다." });
  }
});

/**
 * GET /storage/objects/:path
 * Serve private object entities.
 */
router.get(/^\/storage\/objects\/(.+)$/, async (req: Request, res: Response) => {
  const objectPath = "/objects/" + (req.params as any)[0];

  try {
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(file);
    res.set("Content-Type", response.headers.get("Content-Type") ?? "application/octet-stream");
    res.set("Cache-Control", response.headers.get("Cache-Control") ?? "public, max-age=86400");
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.status(204).end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "파일을 찾을 수 없습니다." });
    } else {
      console.error("오브젝트 서빙 실패:", error);
      res.status(500).json({ error: "파일 서빙에 실패했습니다." });
    }
  }
});

export default router;
