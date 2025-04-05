const express = require("express");
const router = express.Router();
const districtController = require("../controllers/districtController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const paginate = require("../middlewares/pagination");

// Middleware de autenticação para todas as rotas
router.use(requireAuth);

// Rota para listar todos os distritos
router.get("/", paginate, districtController.getAllDistricts);

// Rota para obter um distrito específico pelo ID
router.get("/:id", districtController.getDistrictById);

// Rotas protegidas (apenas Master)
router.post("/", requireRole('Master'), districtController.createDistrict);
router.put("/:id", requireRole('Master'), districtController.updateDistrict);
router.delete("/:id", requireRole('Master'), districtController.deleteDistrict);

module.exports = router;
