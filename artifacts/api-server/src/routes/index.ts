import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable } from "@workspace/db/schema";
import healthRouter from "./health";
import adminRouter from "./admin";
import reservationsRouter from "./reservations";
import staffRouter from "./staff";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use("/reservations", reservationsRouter);
router.use("/staff", staffRouter);
router.use(storageRouter);

router.get("/site-settings", async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const result: Record<string, string> = {};
    for (const row of rows) result[row.key] = row.value;
    res.json(result);
  } catch {
    res.json({});
  }
});

export default router;
