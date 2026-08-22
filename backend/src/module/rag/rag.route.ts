import ragController = require("./rag.controller");
import {
  testFetchHandler,
  ingestHandler,
  queryHandler,
  resetHandler,
} from "./rag.controller";
import { Router } from "express";

const router = Router();

router.get("/laws", ragController.testFetchHandler);
router.get("/ingest", ragController.ingestHandler);
router.post("/query", ragController.queryHandler);
router.delete("/reset", resetHandler);
export default router;
