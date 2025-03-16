const express = require("express");
const router = express.Router();
const districtController = require("../controllers/districtController");
const authMiddleware = require('../middlewares/auth');

// Rota para listar todos os distritos
router.get("/", authMiddleware(), districtController.renderDistrictsPage);

// Rota para criar um novo distrito (apenas usuário Master pode criar)
router.post("/create", authMiddleware(["Master"]), districtController.createDistrict);

// Rota para listar todos os distritos
router.get("/", authMiddleware(), districtController.getAllDistricts);

// Rota para obter um distrito específico pelo ID
router.get("/:id", authMiddleware(), districtController.getDistrictById);

// Rota para atualizar um distrito pelo ID (apenas usuário Master pode atualizar)
router.put("/edit/:id", authMiddleware("Master"), districtController.updateDistrict);

// Rota para excluir um distrito pelo ID (apenas usuário Master pode excluir)
router.delete("/delete/:id", authMiddleware("Master"), districtController.deleteDistrict);

module.exports = router;
