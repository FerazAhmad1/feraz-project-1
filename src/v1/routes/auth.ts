import express from "express";
import { signup_otp, login, update_role, forgot_password, reset_password, verify_otp } from "../controller/users";
import { validate_body } from "../helper.ts/helpfn";
import { signupSchema, forgot_password_schema, reset_password_schema, login_schema } from "../helper.ts/schema";
import { protect, restrict_to } from "../helper.ts/helpfn";

const router = express.Router();
console.log("I am auth router running");
router.post("/signup", signup_otp);
router.post("/verifyotp", verify_otp);
router.post("/login", validate_body(login_schema), login);
router.post("/approoverole", protect, restrict_to("user"), update_role);
router.post("/forgotpassword", validate_body(forgot_password_schema), forgot_password);
router.post("/resetpassword/:token", validate_body(reset_password_schema), reset_password);
export default router;
