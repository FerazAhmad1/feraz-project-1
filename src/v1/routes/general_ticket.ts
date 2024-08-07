import express from "express";
import { create_general_ticket } from "../controller/general_ticket";
import { protect } from "../helper.ts/helpfn";
import { validate_body } from "../helper.ts/helpfn";
import { general_ticket_schema } from "../helper.ts/schema";
const router = express.Router();
router.route("/").post(protect, validate_body(general_ticket_schema), create_general_ticket);
export default router;
