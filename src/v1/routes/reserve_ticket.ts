import express from "express";
import {
  create_reserve_ticket,
  get_all_ticket,
  cancel_ticket,
} from "../controller/reserve_ticket";
import { protect } from "../helper.ts/helpfn";
import { validate_body } from "../helper.ts/helpfn";
import { get_all_ticket_schema, reserve_ticket_schema } from "../helper.ts/schema";
const router = express.Router();

router.post("/all_tickets", protect, validate_body(get_all_ticket_schema), get_all_ticket)
router
  .route("/")
  .post(protect, validate_body(reserve_ticket_schema), create_reserve_ticket);
router.post("/cancelticket", protect, cancel_ticket);
export default router;
