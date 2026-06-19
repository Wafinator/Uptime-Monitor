const express = require("express");
const ctrl = require("../controllers/monitorsController");

const router = express.Router();

router.get("/", ctrl.listMonitors);
router.post("/", ctrl.createMonitor);
router.get("/:id", ctrl.getMonitor);
router.patch("/:id", ctrl.updateMonitor);
router.delete("/:id", ctrl.deleteMonitor);
router.get("/:id/logs", ctrl.getMonitorLogs);

module.exports = router;
