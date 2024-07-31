import { Request, Response } from "express";
import {
  signupSchema,
  login_schema,
  forgot_password_schema,
  reset_password_schema,
} from "../helper.ts/schema";
import { applyValidation } from "../helper.ts/validation";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  create_random_token,
  send_otp,
  formatDateString,
} from "../helper.ts/helpfn";
import user from "../model/dbusers";
import html_template from "../helper.ts/html";
import { send_mail, generateOTP } from "../helper.ts/helpfn";
import crypto from "crypto";
import { date } from "joi";
const signToken = (id: any) =>
  jwt.sign({ id }, process.env.JWT_SECRET || "90d", {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// export const signup = async (req: Request, res: Response) => {
//   try {
//     const validate = await applyValidation(signupSchema, req.body);
//     console.log("ffffffff", validate);
//     const { firstName, lastName, email, mobile, password } = req.body;
//     const signupBody = { firstName, lastName, email, mobile, password };
//     const hashedPasssword = await bcrypt.hash(password, 12);
//     signupBody.password = hashedPasssword;
//     const id = await user.insertUser(signupBody);
//     if (!id) {
//       throw { message: "this email already exist" };
//     }
//     console.log(id);
//     const token = signToken(id);
//     res.status(200).json({
//       error: false,
//       message: "signup successfull",
//       data: { token },
//     });
//   } catch (err) {
//     const error = err as any;
//     console.log(err);
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const signup_otp = async (req: Request, res: Response) => {
  try {
    const validate = await applyValidation(forgot_password_schema, req.body);
    const { email } = validate;
    const db_user = await user.getUser({ email });
    if (db_user.length > 0) {
      const { password = null } = db_user[0];
      if (password) {
        throw {
          message: "this email is already registered with us",
        };
      }

      const { otp_expiry } = db_user[0];
      // otp is not null and it is not expired yet
      if (otp_expiry && new Date(otp_expiry) > new Date()) {
        // resend the same otp
        const { otp } = db_user[0];
        const mailResponse = await send_otp(otp, email);
        res.status(200).json({
          error: false,
          message: "a six digit otp has been sended to your email",
          data: { otp },
        });
      }

      // otp is not null and expired

      if (otp_expiry && new Date(otp_expiry) < new Date()) {
        // resend new otp and set new expiry time
        const otp = generateOTP();
        const newExpirytime = formatDateString(
          new Date(Date.now() + 10 * 60 * 1000),
          "YYYY-MM-DD HH:mm:ss"
        );
        const { id } = db_user[0];
        const response = await user.update_user(id, {
          otp_expiry: newExpirytime,
          otp,
        });
        if (!response) {
          throw { message: "error is coming from update_user" };
        }
        const mailResponse = await send_otp(otp, email);
        res.status(200).json({
          error: false,
          message: "a six digit otp has been sended to your email",
          data: { otp },
        });
      }
    }
    const otp = generateOTP();
    const newExpirytime = formatDateString(
      new Date(Date.now() + 10 * 60 * 1000),
      "YYYY-MM-DD HH:mm:ss"
    );
    const inserUser_response = await user.insertUser({
      email,
      otp,
      otp_expiry: newExpirytime,
    });
    if (!inserUser_response) {
      throw { message: "error is coming from insertUser method" };
    }
    const mailResponse = await send_otp(otp, email);

    res.status(200).json({
      error: false,
      message: "a six digit otp has been sended to your email",
      data: { otp },
    });
  } catch (error) {
    const err = error as any;
    res.status(400).json({
      error: true,
      message: err.message,
      data: {},
    });
  }
};

export const verify_otp = async (req: Request, res: Response) => {
  try {
    const validate = await applyValidation(signupSchema, req.body);
    const db_user = await user.getUser({ email: validate.email });
    if (db_user.length === 0) {
      throw { message: "user not found" };
    }
    const { otp: dbotp, otp_expiry } = db_user[0];

    if (new Date(otp_expiry) < new Date()) {
      throw {
        message: "otp has been expire",
      };
    }

    if (validate.otp !== dbotp) {
      throw {
        message: "Incorrect otp",
      };
    }

    const {
      firstName: firstname,
      lastName: lastname,
      password,
      email,
      mobile,
    } = validate;
    const id = db_user[0].id;
    const hashed_password = await bcrypt.hash(password, 12);
    const updateUser = await user.update_user(id, {
      firstname,
      lastname,
      password: hashed_password,
      email,
      mobile,
      otp: null,
      otp_expiry: null,
    });
    if (!updateUser) {
      throw {
        message: "error is coming from update_user",
      };
    }
    const token = signToken(id);

    res.status(200).json({
      error: false,
      message: "user is signup successfully",
      data: {
        token,
      },
    });
  } catch (error) {
    const err = error as any;
    res.status(200).json({
      error: true,
      message: err.message,
      data: {},
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email = null, password: login_password = null } = req.body;
    const login_body = { email: req.body.email, password: req.body.password };
    const validate = await applyValidation(login_schema, login_body);
    const db_user = await user.getUser({ email });
    if (db_user.length === 0) {
      throw { message: "This email is not registed" };
    }
    const { password: db_password, id } = db_user[0];
    const validate_password = await bcrypt.compare(login_password, db_password);

    if (!validate_password) {
      throw { message: "email or password is wrong" };
    }
    const token = signToken(id);
    res.status(200).json({
      error: false,
      message: "login successfull",
      data: { token },
    });
  } catch (err) {
    const error = err as any;
    res.status(400).json({
      error: true,
      message: error.message,
      data: {},
    });
  }
};

export const update_role = async (req: any, res: Response) => {
  try {
    const data = { role: "agent" };
    const response = await user.update_user(req.user.id, data);
    if (response !== 1) {
      throw {
        message: "Internal server error",
      };
    }
    const data_to_send = {
      ...req.user,
      role: "agent",
      reset_password_token: undefined,
      change_password_at: undefined,
      password: undefined,
    };

    res.status(200).json({
      error: false,
      message: "you are now agent",
      data_to_send,
    });
    console.log("update response", response);
  } catch (error) {
    const err = error as any;
    res.status(500).json({
      error: true,
      message: err.message,
      data: {},
    });
  }
};

export const forgot_password = async (req: Request, res: Response) => {
  try {
    const validate = await applyValidation(forgot_password_schema, req.body);
    const response = await user.getUser({ email: validate.email });
    if (response.length === 0) {
      throw {
        message: "this email does not exist with us",
      };
    }
    const [random_token, hashed_token] = create_random_token();

    await user.update_user(response[0].id, {
      reset_password_token: hashed_token,
    });
    const reset_link = `${req.protocol}://${req.get(
      "host"
    )}/v1/user/resetpassword/${random_token}`;

    let html = html_template.replace(
      "REPLACE_WITH_HTML_CONTENT",
      "<p>To reset password please click on below tab</p>"
    );
    html = html.replace("REPLACE_WITH_LINK", reset_link);
    html = html.replace("REPLACE_WITH_TAB", "reset password");
    const subject = "reset your password";
    const sender = "feraz@gmail.com";
    const mail_response = await send_mail({
      html,
      sender,
      subject,
      reciever: validate.email,
    });
    res.status(200).json({
      reset_link,
    });
  } catch (error) {
    const err = error as any;
    res.status(400).json({
      error: true,
      message: err.message,
      data: {},
    });
  }
};
export const reset_password = async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const password = req.body.password;
    const validate = await applyValidation(reset_password_schema, req.body);
    if (!token) {
      throw {
        message: "you are not autorize to perform this action ",
      };
    }
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const query_find_user = `select * from users where reset_password_token = '${hashedToken}'`;
    const requested_user = await user.executeQuery(query_find_user);
    if (!requested_user) {
      throw {
        message: "Invalid user",
      };
    }

    const hashed_password = await bcrypt.hash(password, 12);
    const query_update_password = await user.update_user(requested_user[0].id, {
      password: hashed_password,
    });
    if (!query_update_password) {
      throw {
        errorCode: 500,
        message: "internal server error",
      };
    }
    res.status(200).json({
      error: false,
      message: "your password has been change successfully",
      data: {},
    });
  } catch (error) {
    const err = error as any;
    res.status(err.errorCode || 401).json({
      error: true,
      message: err.message,
      data: {},
    });
  }
};
