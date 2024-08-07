import express from "express";
import { search_train } from "../controller/train";
import { protect } from "../helper.ts/helpfn";
import { validate_body } from "../helper.ts/helpfn";
import { search_train_schema } from "../helper.ts/schema";
const router = express.Router();

router.post("/search", protect, validate_body(search_train_schema), search_train);

export default router;
