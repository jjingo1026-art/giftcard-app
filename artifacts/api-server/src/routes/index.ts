import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import reservationsRouter from "./reservations";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use("/reservations", reservationsRouter);

export default router;
