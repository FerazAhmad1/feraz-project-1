import express from "express";
import {
  signup_otp,
  login,
  update_role,
  forgot_password,
  reset_password,
  verify_otp,
} from "../controller/users";
import { validate_body } from "../helper.ts/helpfn";
import { signupSchema } from "../helper.ts/schema";
import { protect, restrict_to } from "../helper.ts/helpfn";

const router = express.Router();
console.log("I am auth router running");
router.post("/signup", signup_otp);
router.post("/verifyotp", verify_otp);
router.post("/login", login);
router.post("/approoverole", protect, restrict_to("user"), update_role);
router.post("/forgotpassword", forgot_password);
router.post("/resetpassword/:token", reset_password);
export default router;
