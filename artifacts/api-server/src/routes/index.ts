import { Router, type IRouter } from "express";
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

export default router;
